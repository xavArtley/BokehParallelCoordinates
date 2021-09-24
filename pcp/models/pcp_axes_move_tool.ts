import * as p from "@bokehjs/core/properties"
import {GestureTool, GestureToolView} from "@bokehjs/models/tools/gestures/gesture_tool"
import {PanEvent} from "@bokehjs/core/ui_events"

import {tool_icon_range} from "@bokehjs/styles/icons.css"
import {Axis} from "@bokehjs/models/axes/axis"
import {ColumnDataSource} from "@bokehjs/models/sources/column_data_source"
import {GlyphRenderer} from "@bokehjs/models/renderers/glyph_renderer"
import {inplace_map} from "@bokehjs/core/util/arrayable"
import {argmin} from "@bokehjs/core/util/array"

import {PCPSelectionTool} from "./pcp_selection_tool"

function find_all_indices_close_to_value(
  array: number[],
  value: number,
  eps: number = 1e-1,
): number[] {
  return array.reduce((prev, curr, idx) => {
    if (Math.abs(curr - value) < eps) prev.push(idx)
    return prev
  }, <number[]>[])
}

function argsort(array: number[]): number[] {
  const array_val_idx = array.map((value, idx) => [value, idx])
  array_val_idx.sort((a, b) => {
    if (a[0] < b[0]) return -1
    if (a[0] > b[0]) return 1
    return 0
  })
  return array_val_idx.map((data) => data[1])
}

export class PCPAxesMoveToolView extends GestureToolView {
  model: PCPAxesMoveTool

  old_axis_location: number
  idx_move_axis: number | null
  idx_data_xs: number
  idx_boxes_on_axis: number[]
  cursor_back: (sx: number, sy: number) => string | null

  get move_axis(): Axis | null {
    return this.idx_move_axis != null
      ? <Axis>this.plot_model.right[this.idx_move_axis]
      : null
  }

  get lines_data_source(): ColumnDataSource {
    const renderer = <GlyphRenderer>(
      this.plot_model.renderers.filter((r) => r.name == "pcp_lines_renderer")[0]
    )
    return <ColumnDataSource>renderer.data_source
  }

  get selection_data_source(): ColumnDataSource {
    const renderer = <GlyphRenderer>(
      this.plot_model.renderers.filter(
        (r) => r.name == "pcp_selection_renderer",
      )[0]
    )
    return <ColumnDataSource>renderer.data_source
  }

  get __xs(): number[][] {
    return this.lines_data_source.get_array("__xs")
  }

  get __ys(): number[][] {
    return this.lines_data_source.get_array("__ys")
  }

  get x_selection_boxes(): number[] {
    return <number[]>this.selection_data_source.get_array("x")
  }

  get axes(): Axis[] {
    return <Axis[]>this.plot_model.right
  }

  _pan_start(ev: PanEvent): void {
    const x_click_position = this.plot_view.frame.x_scale.invert(ev.sx)
    const dist_click_axes = this.axes.map((axis) =>
      Math.abs(<number>axis.fixed_location! - x_click_position),
    )
    this.idx_move_axis =
      Math.min(...dist_click_axes) < 0.25 ? argmin(dist_click_axes) : null
    if (this.idx_move_axis != null) {
      this.old_axis_location = <number>this.move_axis!.fixed_location
      this.idx_data_xs = find_all_indices_close_to_value(this.__xs[0], this.old_axis_location)[0]
      this.idx_boxes_on_axis = find_all_indices_close_to_value(this.x_selection_boxes, this.old_axis_location)
      this.model.document?.interactive_start(this.plot_model)
    }
  }

  _pan(ev: PanEvent): void {
    if (this.move_axis != null) {
      const current_x = this.plot_view.frame.x_scale.invert(ev.sx)
      this.move_axis!.fixed_location = current_x
      this.__xs.forEach((arr) => (arr[this.idx_data_xs] = current_x))
      this.idx_boxes_on_axis.forEach(
        (idx) => (this.x_selection_boxes[idx] = current_x),
      )
      if (Math.abs(current_x - this.old_axis_location) > 1) {
        // handle switch of axes
        // const shift_number = Math.floor(Math.abs(current_x - this.old_axis_location)) // number of axes passed (should be always 1 if event fast enough)
        const shift_sign = current_x - this.old_axis_location < 0 ? -1 : 1 // left : -1 | right : -1
        const shift_number = Math.floor(
          Math.abs(current_x - this.old_axis_location),
        )
        if (shift_sign == -1 && this.old_axis_location > 0) {
          // move by one place on the right (+1) all axes with (current_x < axis.fixed_location < old_axis_location)
          this.axes
            .filter(
              (axis) =>
                axis.fixed_location! > current_x &&
                axis.fixed_location! < this.old_axis_location,
            )
            .forEach((axis) => ((<number>axis.fixed_location) += 1))
          // sort parallel_data_source in ascent order against __xs and add 1 to current_x < __xs[i] < old_axis_location
          const __xs0 = this.__xs[0]
          const sort_indices = argsort(__xs0)
          const new_xs = sort_indices.map((idx) => {
            const __xsi = __xs0[idx]
            if (current_x < __xsi && __xsi < this.old_axis_location)
              return __xsi + 1
            else return __xsi
          })
          inplace_map(this.__xs, (_) => new_xs)
          inplace_map(this.__ys, (item) => sort_indices.map((idx) => item[idx]))
          // add 1 to x of selection boxes if to current_x < x < old_axis_location
          inplace_map(this.x_selection_boxes, (xi) => {
            if (current_x < xi && xi < this.old_axis_location) return xi + 1
            else return xi
          })
          this.old_axis_location = Math.ceil(current_x)
          this.idx_data_xs = Math.max(this.idx_data_xs - shift_number, 0)
          if (this.model.pcp_selection_tool != null)
            this.model.pcp_selection_tool.invalidate_selection = true
        } else if (
          shift_sign == 1 &&
          this.old_axis_location < this.axes.length - 1
        ) {
          // move by one place on the left (-1) all axes with (old_axis_location < axis.fixed_location < current_x)
          this.axes
            .filter(
              (axis) =>
                axis.fixed_location! < current_x &&
                axis.fixed_location! > this.old_axis_location,
            )
            .forEach((axis) => ((<number>axis.fixed_location) -= 1))
          // sort parallel_data_source in ascent order against __xs and substract 1 to old_axis_location < __xs[i] < current_x
          const __xs0 = this.__xs[0]
          const sort_indices = argsort(__xs0)
          const new_xs = sort_indices.map((idx) => {
            const __xsi = __xs0[idx]
            if (this.old_axis_location < __xsi && __xsi < current_x)
              return __xsi - 1
            else return __xsi
          })
          inplace_map(this.__xs, (_) => new_xs)
          inplace_map(this.__ys, (item) => sort_indices.map((idx) => item[idx]))
          // substract 1 to x of selection boxes if to current_x < x < old_axis_location
          inplace_map(this.x_selection_boxes, (xi) => {
            if (this.old_axis_location < xi && xi < current_x) return xi - 1
            else return xi
          })
          this.idx_data_xs = Math.min(
            this.idx_data_xs + shift_number,
            this.__xs.length - 1,
          )
          this.old_axis_location = Math.floor(current_x)
          if (this.model.pcp_selection_tool != null)
            this.model.pcp_selection_tool.invalidate_selection = true
        }
      }
      this.lines_data_source.change.emit()
      this.selection_data_source.change.emit()
    }

    this.model.document?.interactive_start(this.plot_model)
  }

  _pan_end(_e: PanEvent): void {
    if (this.idx_move_axis != null) {
      const new_xs = this.__xs[0].map((__xs0i) => {
        if (__xs0i == this.move_axis!.fixed_location)
          return this.old_axis_location
        else return __xs0i
      })
      inplace_map(this.__xs, (_) => new_xs)
      this.move_axis!.fixed_location = this.old_axis_location
      const x_boxes = this.selection_data_source.get_array("x")
      this.idx_boxes_on_axis.forEach(
        (idx) => (x_boxes[idx] = this.move_axis!.fixed_location),
      )
      this.lines_data_source.change.emit()
      this.selection_data_source.change.emit()
      if (this.model.pcp_selection_tool != null)
        this.model.pcp_selection_tool.invalidate_selection = true
      this.idx_move_axis = null
    }
  }
}

export namespace PCPAxesMoveTool {
  export type Attrs = p.AttrsOf<Props>

  export type Props = GestureTool.Props & {
    pcp_selection_tool: p.Property<PCPSelectionTool | null>
  }
}

export interface PCPAxesMoveTool extends PCPAxesMoveTool.Attrs {}

export class PCPAxesMoveTool extends GestureTool {
  properties: PCPAxesMoveTool.Props
  __view_type__: PCPAxesMoveToolView

  constructor(attrs?: Partial<PCPAxesMoveTool.Attrs>) {
    super(attrs)
  }

  static __module__ = "pcp.models.pcp_axes_move_tool"

  static init_PCPAxesMoveTool(): void {
    this.prototype.default_view = PCPAxesMoveToolView
    this.define<PCPAxesMoveTool.Props>(({Nullable, Ref}) => ({
      pcp_selection_tool: [Nullable(Ref(PCPSelectionTool)), null],
    }))
  }

  icon = tool_icon_range
  tool_name = "Axe Move"
  event_type = "pan" as "pan"
}
