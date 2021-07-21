import sys
import param
import pandas as pd

from panel.pane.base import PaneBase
from bokeh.core.properties import ColorHex
from .models.pcp_selection_tool import PCPSelectionTool
from .plot.pcp_plot import _parallel_plot


class ParallelCoordinatePane(PaneBase):

    selection = param.List()

    line_color = param.Color()
    line_alpha = param.Number(default=0.5, bounds=(0, 1))
    line_width = param.Number(default=0.1, bounds=(0, 10))

    nonselection_line_color = param.Color()
    nonselection_line_alpha = param.Number(default=0.5, bounds=(0, 1))
    nonselection_line_width = param.Number(default=0.1, bounds=(0, 10))

    selection_line_color = param.Color()
    selection_line_alpha = param.Number(default=1., bounds=(0, 1))
    selection_line_width = param.Number(default=0.1, bounds=(0, 10))

    box_color = param.Color()
    box_width = param.Integer(default=10, bounds=(1, 40))

    _manual_params = ["selection"]

    _visual_options = ["line_color", "line_alpha", "line_width", "nonselection_line_color",
                       "nonselection_line_alpha", "nonselection_line_width", "selection_line_color",
                       "selection_line_alpha", "selection_line_width", "box_color", "box_width"]
    @classmethod
    def applies(cls, obj, **kwargs):
        if 'pcp' not in sys.modules:
            return False
        else:
            return isinstance(obj, pd.DataFrame)

    def _get_model(self, doc, root=None, parent=None, comm=None):

        model = _parallel_plot(self.object)
        pcp_sel_tool = model.select_one(PCPSelectionTool)
        self._renderer_multiline = pcp_sel_tool.renderer_data
        self._selected = self._renderer_multiline.data_source.selected
        self._renderer_box = pcp_sel_tool.renderer_select

        # self._make_binding(model)
        props = self._process_param_change(self._init_params())

        for p in ["selection"] + self._visual_options:
            props.pop(p, None)
        model.update(**props)
        self._link_props(self._selected, ["indices"], doc, root, comm)
        if root is None:
            root = model
        self._models[root.ref['id']] = (model, parent)

        return model

    def _process_property_change(self, msg):
        if "indices" in msg:
            msg["selection"] = msg.pop("indices")
        return super()._process_property_change(msg)

    def _update_model(self, events, msg, root, model, doc, comm):
        if "selection" in msg:
            self._selected.indices = msg.pop("selection")
        if "line_color" in msg:
            self._renderer_multiline.glyph.line_color = msg.pop("line_color")
        if "line_alpha" in msg:
            self._renderer_multiline.glyph.line_alpha = msg.pop("line_alpha")
        if "line_width" in msg:
            self._renderer_multiline.glyph.line_width = msg.pop("line_width")
        if "nonselection_line_color" in msg:
            self._renderer_multiline.nonselection_glyph.line_color = msg.pop("nonselection_line_color")
        if "nonselection_line_alpha" in msg:
            self._renderer_multiline.nonselection_glyph.line_alpha = msg.pop("nonselection_line_alpha")
        if "nonselection_line_width" in msg:
            self._renderer_multiline.nonselection_glyph.line_width = msg.pop("nonselection_line_width")
        if "selection_line_color" in msg:
            self._renderer_multiline.selection_glyph.line_color = msg.pop("selection_line_color")
        if "selection_line_alpha" in msg:
            self._renderer_multiline.selection_glyph.line_alpha = msg.pop("selection_line_alpha")
        if "selection_line_width" in msg:
            self._renderer_multiline.selection_glyph.line_width = msg.pop("selection_line_width")
        super()._update_model(events, msg, root, model, doc, comm)
