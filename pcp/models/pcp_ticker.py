from bokeh.core.properties import Float, Instance, List, Int
from bokeh.core.properties import List, Instance
from bokeh.models import Ticker, Axis


class PCPTicker(Ticker):
    """Tool for parallel plot
    ticks based on parallel axes
    """
    pcp_axes = List(Instance(Axis))

