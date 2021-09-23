from pcp.models.pcp_selection_tool import PCPSelectionTool
from bokeh.core.properties import Instance, Bool
from bokeh.models import GestureTool


class PCPAxesMoveTool(GestureTool):
    """Tool for parallel plot
    Allow to reorganize axes
    """

    pcp_selection_tool = Instance(PCPSelectionTool)

