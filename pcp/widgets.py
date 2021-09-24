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
