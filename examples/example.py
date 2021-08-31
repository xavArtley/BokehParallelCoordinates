import panel as pn
from bokeh.palettes import Viridis256
from bokeh.sampledata.autompg import autompg_clean as df
from pcp import ParallelCoordinates


# make bokeh parallel plot
ParallelCoordinates(df, drop=["name"]).show()
