import param
import panel as pn

from panel.viewable import Viewer
from panel.widgets.select import _MultiSelectBase

from holoviews.plotting.util import process_cmap, list_cmaps

from .models.multiselect import PCPMultiSelect

class MultiSelect(_MultiSelectBase):

    _widget_type = PCPMultiSelect

    theme = param.ObjectSelector(default="light", objects=["light", "dark"])

    searchbox = param.Boolean(default=True)

    selectall = param.Boolean(default=True)


class ColorMapSelection(Viewer):

    _name = param.ObjectSelector(default=None, objects=[None], allow_None=True, precedence=-1)

    _provider = param.ObjectSelector(default=None, objects=[None, "bokeh", "matplotlib", "colorcet"], precedence=2)

    @param.depends("_provider", watch=True)
    def _update_cmap_names(self):
        with param.batch_watch(self):
            self._name = None
            if self._provider is not None:
                self.param._name.precedence = 1
                self.param._name.objects = [None] + list_cmaps(self._provider)
            else:
                self.param._name.precedence = -1
                self.param._name.objects = [None]

    def hex_list(self):
        if self._name is not None:
            return process_cmap(self._name)
        else:
            return None

# class _PCPSelectionLineColor(param.Parameterized):

#     mode = param.ObjectSelector(default="Color", objects=["Color", "ColorMap"])

#     color = param.Color(default="#000000")

#     cmap = param.Parameter(default=_ColorMapSelection())

#     palette = param.List(constant=True)


#     def __init__(self, **params):
#         super().__init__(**params)
#         self._update_palette()

#     @param.depends("mode", watch=True)
#     def _visibility(self):
#         if self.mode == "Color":
#             self.param.color.precedence = 1
#         else:
#             self.param.color.precedence = -1

#     @param.depends("mode")
#     def _cmap_layout(self):
#         if self.mode == "ColorMap":
#             return pn.Param(self.cmap, default_layout=pn.Row, show_name=False)

#     def __panel__(self):
#         return pn.Column(
#             pn.Param(self, parameters=["mode"], widgets={"mode": {"type": pn.widgets.RadioButtonGroup}}, show_name=False),
#             pn.Param(self, parameters=["color"], show_name=False),
#             self._cmap_layout,
#         )

#     @param.depends("mode", "color", "cmap._name", watch=True)
#     def _update_palette(self):
#         with param.edit_constant(self):
#             if self.mode == "Color":
#                 self.palette = [self.color]
#             if self.mode == "ColorMap" and self.cmap._name is not None:
#                 self.palette = self.cmap.hex_list()