import * as p from "@bokehjs/core/properties"
import {BoxSelectTool, BoxSelectToolView} from "@bokehjs/models/tools/gestures/box_select_tool"
import {Rect} from "@bokehjs/models/glyphs/rect"
import {ColumnDataSource} from "@bokehjs/models/sources/column_data_source"
import {GlyphRenderer} from "@bokehjs/models/renderers/glyph_renderer"
import {CartesianFrame, MultiLine, Scale} from "@bokehjs/models"
import {MoveEvent, PanEvent, TapEvent, KeyEvent} from "@bokehjs/core/ui_events"
import {intersection, union, transpose} from "@bokehjs/core/util/array"
import {SelectionMode} from "@bokehjs/core/enums"
import {Keys, offset} from "@bokehjs/core/dom"
import {BBox} from "@bokehjs/core/util/bbox"
import {BoxAnnotationView, EDGE_TOLERANCE} from "@bokehjs/models/annotations/box_annotation"

export interface HasRectCDS {
  glyph: Rect
  data_source: ColumnDataSource
}

export interface HasMultiLineCDS {
  glyph: MultiLine
  data_source: ColumnDataSource
}

type Action = "add" | "resize" | "drag"

type BoxScreenParameters = {
  xs: number
  ys: number
  hs: number
  ws: number
}

function find_indices_in(
  array: number[],
  [inf, sup]: [number, number],
): number[] {
  return array.reduce((prev, curr, index) => {
    if (inf <= curr && curr <= sup) prev.push(index)
    return prev
  }, <number[]>[])
}

function index_array(array: number[], indices: number[]): number[] {
  return indices.reduce((a: number[], i) => a.concat(array[i]), [])
}

function combineByKey(key: string, array: any[]) {
  const keys: string[] = Object.keys(array[0])
  const combined: any[] = []
  array.forEach((itm) => {
    const idx = combined.map((item) => item[key]).indexOf(itm[key])
    if (idx >= 0) {
      keys.forEach((element) => {
        if (element != key) combined[idx][element].push(itm[element])
      })
    } else {
      const new_object: any = {}
      keys.forEach((element) => {
        if (element == key) {
          new_object[element] = itm[element]
        } else {
          new_object[element] = [itm[element]]
        }
      })
      combined.push(new_object)
    }
  })
  return combined
}

export class PCPSelectionView extends BoxSelectToolView {
  model: PCPSelectionTool

  private xscale: Scale
  private yscale: Scale
  private cds_select: ColumnDataSource
  private cds_data: ColumnDataSource
  private glyph_select: Rect
  private glyph_data: MultiLine
  private action: Action = "add"
  private ind_active_box: null | number
  private _base_box_parameters: BoxScreenParameters | null
  private selections: {
    data_idx: number
    indices: number[]
  }[] //must be synchronize with element of cds_select
  private is_selecting: boolean = false
  private is_mouse_down: boolean = false
  private mouse_up_handler: EventListenerOrEventListenerObject

  initialize(): void {
    super.initialize()

    const {x_range_name: x_range_name_select, y_range_name: y_range_name_select} = this.model.renderer_select
    const {x_range_name: x_range_name_data, y_range_name: y_range_name_data} = this.model.renderer_data

    if (x_range_name_select == x_range_name_data && y_range_name_select == y_range_name_data) {
      this.xscale = this.frame.x_scales.get(x_range_name_select)!
      this.yscale = this.frame.y_scales.get(y_range_name_select)!
    } else throw new Error("selection and data does not share the same ranges")

    //TODO test if parallel CDS is valid (xs for each line should be identical)
    this.glyph_select = this.model.renderer_select.glyph
    this.glyph_data = this.model.renderer_data.glyph

    this.cds_select = this.model.renderer_select.data_source
    this.cds_data = this.model.renderer_data.data_source

    this.selections = []

    this.hit_area.addEventListener("mousedown", (ev: MouseEvent) =>
      this._mouse_down(ev),
    )
    this.mouse_up_handler = () => this._mouse_up()
    document.addEventListener("mouseup", this.mouse_up_handler)
  }

  get xdata(): number[] {
    return this.cds_data.get_array(
      (this.glyph_data as any).xs.field,
    )[0] as number[]
  }

  get ydataT(): number[][] {
    return transpose(this.cds_data.get_array((this.glyph_data as any).ys.field))
  }

  get frame(): CartesianFrame {
    return this.plot_view.frame
  }

  connect_signals() {
    super.connect_signals()
    const {x_range_name: x_range_name_select} = this.model.renderer_select
    this.connect(this.frame.x_ranges.get(x_range_name_select)!.change, () =>
      this._resize_boxes_on_zoom(),
    )
    this.connect(this.cds_select.change, () => {
      if (this.is_selecting) this._update_data_selection()
    })
    this.connect(this.model.properties.invalidate_selection.change, () => {
      if (this.model.invalidate_selection) {
        this._recompute_selections()
        this.model.setv({invalidate_selection: false}, {silent: true})
      }
    })
    this.connect(this.model.properties.active.change, () =>
      !this.model.active ? this._update_overlay_bbox(-1) : null,
    )
    this.connect(this.cds_data.selected.properties.indices.change, () => {
      if (!this.is_mouse_down)
        this.model.indices_throttled = this.cds_data.selected.indices
      if (!this.is_selecting) //not changed with this tool
        this._delete_all_selections()
    })
  }

  remove() {
    document.removeEventListener("mouseup", this.mouse_up_handler)
    super.remove()
  }

  get hit_area(): HTMLElement {
    return this.plot_view.canvas_view.events_el
  }

  get overlay_view(): BoxAnnotationView {
    return this.plot_view
      .get_renderer_views()
      .filter((view) => view.model === this.model.overlay)[0] as any
  }

  get _box_width(): number {
    return Math.abs(
      this.xscale.invert(this.model.box_width) - this.xscale.invert(0),
    )
  }

  get _cds_select_keys() {
    const glyph_select: any = this.glyph_select
    const [xkey, ykey] = [glyph_select.x.field, glyph_select.y.field]
    const [wkey, hkey] = [glyph_select.width.field, glyph_select.height.field]
    return {xkey, ykey, wkey, hkey}
  }

  _mouse_down(ev: MouseEvent): void {
    this.is_mouse_down = true
    const {pageX, pageY} = ev
    const {left, top} = offset(this.hit_area)
    const sx = pageX - left,
      sy = pageY - top
    this.ind_active_box = this._hit_test_boxes(sx, sy)
    if (this.ind_active_box != null) {
      this._update_overlay_bbox(this.ind_active_box)
      if (this.overlay_view.cursor(sx, sy) == "ns-resize")
        this.action = "resize"
      else this.action = "drag"
    } else {
      this.action = "add"
    }
  }

  _mouse_up(): void {
    this.is_mouse_down = false
    this.model.indices_throttled = this.cds_data.selected.indices
  }

  _box_screen_paramaters(index: number): BoxScreenParameters {
    const {xkey, ykey, wkey, hkey} = this._cds_select_keys
    const x = this.cds_select.get_array<number>(xkey)[index]
    const y = this.cds_select.get_array<number>(ykey)[index]
    const w = this.cds_select.get_array<number>(wkey)[index]
    const h = this.cds_select.get_array<number>(hkey)[index]

    const xs = this.xscale.compute(x)
    const r_xs = this.xscale.r_compute(x - w / 2, x + w / 2)
    const ws = Math.abs(r_xs[1] - r_xs[0])

    const ys = this.yscale.compute(y)
    const r_ys = this.yscale.r_compute(y - h / 2, y + h / 2)
    const hs = Math.abs(r_ys[1] - r_ys[0])
    return {xs, ys, ws, hs}
  }

  _hit_test_boxes(sx: number, sy: number): number | null {
    const nboxes = this.cds_select.get_length()
    if (nboxes) {
      for (let i = nboxes - 1; i >= 0; i--) {
        const {xs, ys, ws, hs} = this._box_screen_paramaters(i)
        const xs0 = Math.min(xs - ws / 2, xs + ws / 2) - EDGE_TOLERANCE
        const xs1 = Math.max(xs - ws / 2, xs + ws / 2) + EDGE_TOLERANCE
        const ys0 = Math.min(ys - hs / 2, ys + hs / 2) - EDGE_TOLERANCE
        const ys1 = Math.max(ys - hs / 2, ys + hs / 2) + EDGE_TOLERANCE

        if (sx >= xs0 && sx <= xs1 && sy >= ys0 && sy <= ys1) return i
      }
    }
    return null
  }

  _resize_boxes_on_zoom() {
    //resize selection boxes when zooming to keep a constant (pixel) size
    const cds = this.cds_select
    const array_width = cds.get_array((this.glyph_select as any).width.field)
    const new_width = this._box_width
    array_width.forEach((_, i) => (array_width[i] = new_width))
    this.cds_select.change.emit()
  }

  _update_box_ypos(index_box: number, delta_ys: number): void {
    if (this._base_box_parameters != null) {
      const cds = this.cds_select
      const {ykey} = this._cds_select_keys
      const {ys: current_ys, hs} = this._base_box_parameters
      const ysmax =
        Math.max(this.yscale.compute(1), this.yscale.compute(0)) - hs / 2
      const ysmin =
        Math.min(this.yscale.compute(1), this.yscale.compute(0)) + hs / 2
      const new_ys = Math.max(Math.min(current_ys + delta_ys, ysmax), ysmin)
      cds.get_array<number>(ykey)[index_box] = this.yscale.invert(new_ys)
      this.cds_select.change.emit()
      this._update_selection(
        index_box,
        this.yscale.r_invert(new_ys - hs / 2, new_ys + hs / 2),
      )
    }
  }

  _update_box_height(index_box: number, sy: number): void {
    if (this._base_box_parameters != null) {
      const cds = this.cds_select
      const {hkey} = this._cds_select_keys
      const {ys} = this._base_box_parameters
      const hmax =
        2 *
        Math.min(
          Math.abs(ys - this.yscale.compute(0)),
          Math.abs(ys - this.yscale.compute(1)),
        )
      const new_hs = Math.min(
        Math.max(2 * Math.abs(sy - ys), 2 * EDGE_TOLERANCE),
        hmax,
      )
      cds.get_array<number>(hkey)[index_box] = Math.abs(
        this.yscale.invert(new_hs) - this.yscale.invert(0),
      )
      this.cds_select.change.emit()
      this._update_selection(
        index_box,
        this.yscale.r_invert(ys - new_hs / 2, ys + new_hs / 2),
      )
    }
  }

  _update_overlay_bbox(index_box: number): void {
    if (index_box >= 0 && this.model.active) {
      const cds = this.cds_select
      const {xkey, ykey, wkey, hkey} = this._cds_select_keys
      const x = cds.get_array<number>(xkey)[index_box]
      const y = cds.get_array<number>(ykey)[index_box]
      const w = cds.get_array<number>(wkey)[index_box]
      const h = cds.get_array<number>(hkey)[index_box]
      const [x0, x1] = this.xscale.r_compute(x - w, x + w)
      const [y0, y1] = this.yscale.r_compute(y - h / 2, y + h / 2)
        ; (<any>this.overlay_view).bbox = new BBox({x0, y0, x1, y1})
    } else {
      ; (<any>this.overlay_view).bbox = new BBox({x0: 0, y0: 0, x1: 0, y1: 0})
    }
  }

  _drag(ev: PanEvent) {
    if (this.ind_active_box != null && this._base_point != null) {
      const delta_ys = ev.sy - this._base_point[1]
      this._update_box_ypos(this.ind_active_box, delta_ys)
      this._update_overlay_bbox(this.ind_active_box)
    }
  }

  _resize(ev: PanEvent): void {
    if (this.ind_active_box != null) {
      this._update_box_height(this.ind_active_box, ev.sy)
      this._update_overlay_bbox(this.ind_active_box)
    }
  }

  _drag_stop(_ev: PanEvent) {
    this._base_point = null
    this._base_box_parameters = null
  }

  _pan_start(ev: PanEvent) {
    this.is_selecting = true
    if (this.action == "add") super._pan_start(ev)
    else if (this.action == "drag" || this.action == "resize") {
      if (this.ind_active_box != null) {
        this._base_point = [ev.sx, ev.sy]
        this._base_box_parameters = this._box_screen_paramaters(
          this.ind_active_box,
        )
      }
    }
    this.model.document?.interactive_start(this.plot_model)
  }

  _pan(ev: PanEvent) {
    switch (this.action) {
      case "add": {
        super._pan(ev)
        break
      }
      case "drag": {
        this._drag(ev)
        break
      }
      case "resize": {
        this._resize(ev)
        break
      }
    }
    this.model.document?.interactive_start(this.plot_model)
  }

  _pan_end(ev: PanEvent) {
    switch (this.action) {
      case "add": {
        super._pan_end(ev)
        this._update_overlay_bbox(this.cds_select.get_length()! - 1)
        break
      }
      case "drag": {
        this._drag_stop(ev)
        break
      }
      case "resize": {
        break
      }
    }
    this.is_selecting = false
  }

  _move(ev: MoveEvent) {
    if (this.is_selecting || this.is_mouse_down) return
    this.ind_active_box = this._hit_test_boxes(ev.sx, ev.sy)
    if (this.ind_active_box != null)
      this._update_overlay_bbox(this.ind_active_box)
  }

  _doubletap(_ev: TapEvent) {
    //delete box on double tap
    this.is_selecting = true
    if (this.ind_active_box != null) {
      this.cds_select.columns().forEach((key) => {
        this.cds_select.get_array(key).splice(this.ind_active_box as any, 1)
      })
      this._delete_selection(this.ind_active_box)
      this.cds_select.change.emit()
    }
    this.is_selecting = false
  }

  _keyup(ev: KeyEvent) {
    if (ev.keyCode == Keys.Esc) {
      this._delete_all_selections()
    }
  }

  _compute_indices_from_selections(): number[] {
    let indices: number[] = []
    if (this.selections.length > 0) {
      const combined_selections = combineByKey(
        "data_idx",
        this.selections,
      )
      indices = intersection(
        union<number>(...combined_selections[0].indices),
        ...combined_selections
          .slice(1)
          .map((elem) => union<number>(...elem.indices)),
      )
    }
    return indices
  }

  _update_data_selection() {
    this.cds_data.selected.indices = this._compute_indices_from_selections()
    // if (!this.is_mouse_down)
    //   this.model.indices_throttled = this.cds_data.selected.indices
  }

  _make_selections(indices: number[], [y0, y1]: [number, number]) {
    this.selections.push(
      ...indices.map((index) => {
        return {
          data_idx: index,
          indices: find_indices_in(this.ydataT[index], [y0, y1]),
        }
      }),
    )
  }

  _update_selection(index: number, [y0, y1]: [number, number]) {
    this.selections[index].indices = find_indices_in(
      this.ydataT[this.selections[index].data_idx],
      [y0, y1],
    )
  }

  _delete_selection(index: number) {
    this.selections.splice(index, 1)
  }

  _delete_all_selections(emit: boolean = true) {
    const nelems = this.cds_select.get_length()
    if (nelems != null) {
      this.cds_select.columns().forEach((key) => {
        this.cds_select.get_array(key).splice(0, nelems)
      })
      this.selections.splice(0, nelems)
      if (emit) this.cds_select.change.emit()
      this.plot_view.request_render()
    }
  }

  _recompute_selections(): void {
    this.selections.splice(0, this.selections.length)
    const {xkey, ykey, wkey, hkey} = this._cds_select_keys
    const x = this.cds_select.get_array<number>(xkey)
    const y = this.cds_select.get_array<number>(ykey)
    const w = this.cds_select.get_array<number>(wkey)
    const h = this.cds_select.get_array<number>(hkey)
    const xdata = this.xdata
    for (let i = 0; i < this.cds_select.length; i++) {
      const x_indices = find_indices_in(xdata, [
        x[i] - w[i] / 2,
        x[i] + w[i] / 2,
      ])
      this._make_selections(x_indices, [
        y[i] - h[i] / 2,
        y[i] + h[i] / 2,
      ])
    }
  }

  _make_box_select(xs: number[], [y0, y1]: [number, number]): void {
    y0 = Math.max(0, y0)
    y1 = Math.min(1, y1)
    const y = (y0 + y1) / 2
    const w = this._box_width
    const h = y1 - y0

    const {xkey, ykey, wkey, hkey} = this._cds_select_keys
    xs.forEach((x) => {
      if (xkey) this.cds_select.get_array(xkey).push(x)
      if (ykey) this.cds_select.get_array(ykey).push(y)
      if (wkey) this.cds_select.get_array(wkey).push(w)
      if (hkey) this.cds_select.get_array(hkey).push(h)
    })
    this.cds_select.change.emit()
  }

  _do_select([sx0, sx1]: [number, number], [sy0, sy1]: [number, number], _final: boolean = true, _mode: SelectionMode): void {
    // Get selection bbox in the data space
    const [x0, x1] = this.xscale.r_invert(sx0, sx1)
    const [y0, y1] = this.yscale.r_invert(sy0, sy1)

    const x_indices = find_indices_in(this.xdata, [x0, x1])

    const xs = index_array(this.xdata, x_indices)

    this._make_selections(x_indices, [y0, y1])
    this._make_box_select(xs, [y0, y1])
  }
}

export namespace PCPSelectionTool {
  export type Attrs = p.AttrsOf<Props>

  export type Props = BoxSelectTool.Props & {
    renderer_select: p.Property<GlyphRenderer & HasRectCDS>
    renderer_data: p.Property<GlyphRenderer & HasMultiLineCDS>
    box_width: p.Property<number>
    indices_throttled: p.Property<number[]>
    invalidate_selection: p.Property<boolean>
  }
}

export interface PCPSelectionTool extends PCPSelectionTool.Attrs {}

export class PCPSelectionTool extends BoxSelectTool {
  properties: PCPSelectionTool.Props
  __view_type__: PCPSelectionView

  static __module__ = "pcp.models.pcp_selection_tool"

  static init_PCPSelectionTool(): void {
    this.prototype.default_view = PCPSelectionView

    this.define<PCPSelectionTool.Props>(({Number, AnyRef, Array}) => ({
      renderer_select: [AnyRef<GlyphRenderer & HasRectCDS>()],
      renderer_data: [AnyRef<GlyphRenderer & HasMultiLineCDS>()],
      box_width: [Number, 30],
      indices_throttled: [Array(Number)],
    }))

    this.internal<PCPSelectionTool.Props>(({Boolean}) => ({
      invalidate_selection: [Boolean, false],
    }))
  }

  initialize(): void {
    super.initialize()
    this.overlay.in_cursor = "grab"
    this.overlay.ns_cursor = "ns-resize"
  }

  tool_name = "Parallel Selection"
  //override event_type property define in BoxSelectTool
  event_type: any = ["tap" as "tap", "pan" as "pan", "move" as "move", "press" as "press"]
}
