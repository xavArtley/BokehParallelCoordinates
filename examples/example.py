import panel as pn
from bokeh.palettes import Viridis256
from bokeh.sampledata.autompg import autompg_clean as df
from pcp import parallel_plot


# make bokeh parallel plot
p = parallel_plot(df, drop="name", color=df.origin, palette=Viridis256)
p.xaxis.axis_label = ' '
p.title = "Parallel Coordinates"
pn.panel(p, sizing_mode="stretch_both", height=500).show()