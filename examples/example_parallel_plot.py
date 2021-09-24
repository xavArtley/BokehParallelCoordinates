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
wd = pn.widgets.DataFrame(df, sizing_mode="stretch_width", height=300)
pc = ParallelCoordinates(
    df,
    drop=["name"],
    selection_line_color=selection_line_color,
    extra_kwargs = dict(extra_tools = [TapTool()]),
    sizing_mode="stretch_both"
)
wd.link(pc, selection="selection", bidirectional=True)
pn.Column(
    pn.Card(wd, title="Table", sizing_mode="stretch_width"),
    pn.Row(pn.Card(pc.controls()[0], scroll=True, sizing_mode="scale_height"), pc, sizing_mode="stretch_both"), sizing_mode="stretch_both").show()
