from bokeh.core.properties import Float, Instance, List, Int
from bokeh.models import BoxSelectTool, Renderer


class PCPSelectionTool(BoxSelectTool):
    """Selection tool for parallel plot
    To create a selection box, drag the selection around an axe
    When hovering a selection the box can be dragged upside-down
    Double click on a selection to remove it
    Escape key remove all selections
    """

    renderer_select = Instance(Renderer, help="Rectangular Selections glyphs")

    renderer_data = Instance(Renderer, help="MultiLine glyph of the data")

    box_width = Float(help="Width size in the screen coordinate of selection boxes")

    indices_throttled = List(item_type=Int)
