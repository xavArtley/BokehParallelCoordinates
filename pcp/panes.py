import sys
import param
import pandas as pd

from panel.pane.base import PaneBase

from .models.pcp_selection_tool import PCPSelectionTool
from .plot.pcp_plot import parallel_plot


class ParallelCoordinatePane(PaneBase):

    selection = param.List()
    drop = param.ListSelector()

    line_color = param.Color(default="#808080")
    line_alpha = param.Number(default=0.5, bounds=(0, 1))
    line_width = param.Number(default=0.1, bounds=(0, 10))

    nonselection_line_color = param.Color(default="#808080")
    nonselection_line_alpha = param.Number(default=0.5, bounds=(0, 1))
    nonselection_line_width = param.Number(default=0.1, bounds=(0, 10))

    selection_line_color = param.Parameter(default="#ff0000")
    selection_line_alpha = param.Number(default=1., bounds=(0, 1))
    selection_line_width = param.Number(default=1, bounds=(0, 10))

    box_width = param.Integer(default=10, bounds=(1, 40), constant=True)
    box_line_color = param.Color(default="#000000")
    box_line_width = param.Number(default=1, bounds=(0, 10))
    box_fill_color = param.Color(default="#009933")
    box_fill_alpha = param.Number(default=0.7, bounds=(0, 1))


    _rename = {
        "drop": None, "selection": "indices"
    }

    _visual_options = ["line_color", "line_alpha", "line_width", "nonselection_line_color",
                       "nonselection_line_alpha", "nonselection_line_width", "selection_line_color",
                       "selection_line_alpha", "selection_line_width", "box_width", "box_line_color",
                       "box_fill_color", "box_fill_alpha", "box_line_width"]

    @classmethod
    def applies(cls, obj, **kwargs):
        if 'pcp' not in sys.modules:
            return False
        else:
            return isinstance(obj, pd.DataFrame)

    def __init__(self, object, **params):
        drop = params.get("drop",[])
        super().__init__(object=object, **params)
        self.param.drop.objects = object.columns
        self.drop = drop


    def _get_model(self, doc, root=None, parent=None, comm=None):
        visual_params = {p: getattr(self,p) for p in self._visual_options}
        model = parallel_plot(self.object, drop=self.drop, **visual_params)
        pcp_sel_tool = model.select_one(PCPSelectionTool)
        self._renderer_multiline = pcp_sel_tool.renderer_data
        self._selected = self._renderer_multiline.data_source.selected
        self._renderer_box = pcp_sel_tool.renderer_select

        props = self._process_param_change(self._init_params())
        for p in self._visual_options + ["indices"]:
            props.pop(p, None)
        model.update(**props)
        self._link_props(self._selected, ["indices"], doc, root, comm)
        if root is None:
            root = model
        self._models[root.ref['id']] = (model, parent)

        return model

    def _update_model(self, events, msg, root, model, doc, comm):
        if "indices" in msg:
            self._selected.indices = msg.pop("indices")
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
        if "box_line_color" in msg:
            self._renderer_box.glyph.line_color = msg.pop("box_line_color")
        if "box_line_width" in msg:
            self._renderer_box.glyph.line_width = msg.pop("box_line_width")
        if "box_fill_color" in msg:
            self._renderer_box.glyph.fill_color = msg.pop("box_fill_color")
        if "box_fill_alpha" in msg:
            self._renderer_box.glyph.fill_alpha = msg.pop("box_fill_alpha")
        super()._update_model(events, msg, root, model, doc, comm)

    @property
    def _linkable_params(self):
        return [p for p in super()._linkable_params if p != "selection_line_color"]