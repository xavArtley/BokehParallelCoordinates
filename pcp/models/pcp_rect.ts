import { Rect, RectView } from "@bokehjs/models/glyphs/rect"
import { GlyphData } from "@bokehjs/models/glyphs/glyph"
import { Context2d } from "@bokehjs/core/util/canvas"
import { PointGeometry } from "@bokehjs/core/geometry"
import { Selection } from "@bokehjs/models/selections/selection"

import * as p from "@bokehjs/core/properties"

export class PCPRectView extends RectView {
  model: PCPRect

  render(ctx: Context2d, indices: number[], data?: GlyphData) {
    super.render(ctx, indices, data)
  }

  _hit_point(geometry: PointGeometry): Selection {
    return super._hit_point(geometry)
  }
}

export namespace PCPRect {
  export type Attrs = p.AttrsOf<Props>

  export type Props = Rect.Props
}

export interface PCPRect extends PCPRect.Attrs {}

export class PCPRect extends Rect {
  properties: PCPRect.Props
  __view_type__: PCPRectView

  constructor(attrs?: Partial<PCPRect.Attrs>) {
    super(attrs)
  }

  static __module__ = "pcp.models.pcp_rect"

  static init_PCPRect(): void {
    this.prototype.default_view = PCPRectView
  }
}
