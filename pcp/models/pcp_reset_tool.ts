import {ActionTool, ActionToolView} from "@bokehjs/models/tools/actions/action_tool"
import * as p from "@bokehjs/core/properties"

export class PCPResetToolView extends ActionToolView {
  model: PCPResetTool

  doit(): void {
    this.plot_view.reset_range()
  }
}

export namespace PCPResetTool {
  export type Attrs = p.AttrsOf<Props>

  export type Props = ActionTool.Props
}

export interface PCPResetTool extends PCPResetTool.Attrs {}

export class PCPResetTool extends ActionTool {
  properties: PCPResetTool.Props
  __view_type__: PCPResetToolView

  constructor(attrs?: Partial<PCPResetTool.Attrs>) {
    super(attrs)
  }

  static __module__ = "pcp.models.pcp_reset_tool"

  static init_PCPResetTool(): void {
    this.prototype.default_view = PCPResetToolView
  }

  tool_name = "Reset Zoom"
  icon = "bk-tool-icon-reset"
}