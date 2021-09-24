import panel as pn
from bokeh.palettes import Viridis256
from bokeh.models import LinearColorMapper, TapTool
from bokeh.sampledata.autompg import autompg_clean as df
from pcp import ParallelCoordinates

selection_line_color = {
    "field": df.columns[0],
    "transform": LinearColorMapper(
        palette=Viridis256, low=df[df.columns[0]].min(), high=df[df.columns[0]].max()
    ),
}
wd = pn.widgets.DataFrame(df, sizing_mode="stretch_both", height=300)
pc = ParallelCoordinates(
    df,
    drop=["name"],
    selection_line_color=selection_line_color,
    extra_kwargs = dict(extra_tools = [TapTool()]),
    sizing_mode="stretch_both"
)
wd.link(pc, selection="selection", bidirectional=True)
template = pn.template.FastGridTemplate(title="Parallel Coordinates example")
template.sidebar.append(pc.controls()[0])
template.main[:2,:] = wd
template.main[2:6,:] = pc
template.servable()