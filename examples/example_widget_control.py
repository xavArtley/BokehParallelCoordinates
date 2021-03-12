import panel as pn
import pandas as pd
from bokeh.palettes import Viridis256
from bokeh.sampledata.autompg import autompg_clean as df
from pcp import parallel_plot, meta_widgets
pn.extension()

p = parallel_plot(df, drop="name", color=df.origin, palette=Viridis256)
p.xaxis.axis_label = ' '
p.title = "Parallel Coordinates"

print(meta_widgets(p.renderers[1]))