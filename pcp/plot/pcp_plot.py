import numpy as np
from bokeh.models import (
    BasicTickFormatter,
    ColumnDataSource,
    FixedTicker,
    FuncTickFormatter,
    LinearAxis,
    LinearColorMapper,
    MultiLine,
    Range1d,
    TapTool,
    WheelZoomTool,
    Rect,
)
from bokeh.palettes import Viridis256
from bokeh.plotting import figure

from ..models import PCPAxesMoveTool, PCPSelectionTool, PCPResetTool, PCPBoxAnnotation, PCPTicker

def parallel_plot(df_raw, drop=None, **kwargs):
    """From a dataframe create a parallel coordinate plot"""

    if drop is not None:
        df = df_raw.drop(drop, axis=1)
    else:
        df = df_raw.copy()
    npts = df.shape[0]
    ndims = len(df.columns)

    categorical_columns = df.columns.where(df.dtypes == np.object_).dropna()
    for col in categorical_columns:
        df[col] = df[col].apply(
            lambda elem: np.where(df[col].unique() == elem)[0].item()
        )

    startend = dict(kwargs.get("startend", {}))
    for col in df.columns:
        if col not in startend:
            startend.update({col: {"start":df[col].min(), "end":df[col].max()}})
        else:
            col_startend = startend.get(col)
            if "start" not in col_startend:
                col_startend.update({"start": df[col].min()})
            if "end" not in col_startend:
                col_startend.update({"end": df[col].max()})

    data_source = ColumnDataSource.from_df(df)

    for col, val in df.iteritems():
        df[col] = (val - startend[col]["start"]) / (startend[col]["end"] - startend[col]["start"])

    data_source.update(dict(
        __xs=np.arange(ndims)[None, :].repeat(npts, axis=0).tolist(),
        __ys=np.array(df).tolist(),
        # __ys=np.array((df - df.min()) / (df.max() - df.min())).tolist(),
    ))

    tools = kwargs.get("tools", "pan, box_zoom, wheel_zoom")
    pcp_plot = figure(
        x_range=(-1, ndims),
        y_range=(0, 1),
        width=1000,
        tools=tools,
        output_backend="webgl",
    )

    # y axes
    pcp_plot.yaxis.visible = False
    pcp_plot.y_range.start = 0
    pcp_plot.y_range.end = 1
    pcp_plot.y_range.bounds = (-0.1, 1.1)  # add a little padding around y axis
    pcp_plot.xgrid.visible = False
    pcp_plot.ygrid.visible = False

    # Create extra y axis for each dataframe column
    pcp_axes = []
    tickformatter = BasicTickFormatter(precision=1)
    for index, col in enumerate(df.columns):
        start = startend[col]["start"]
        end = startend[col]["end"]
        bound_min = start + abs(end - start) * (pcp_plot.y_range.bounds[0] - pcp_plot.y_range.start)
        bound_max = end + abs(end - start) * (pcp_plot.y_range.bounds[1] - pcp_plot.y_range.end)
        range1d = Range1d(start=bound_min, end=bound_max, bounds=(bound_min, bound_max))
        pcp_plot.extra_y_ranges.update({col: range1d})
        if col not in categorical_columns:
            fixedticks = FixedTicker(ticks=np.linspace(start, end, 8), minor_ticks=[])
            major_label_overrides = {}
        else:
            fixedticks = FixedTicker(ticks=np.arange(end + 1), minor_ticks=[])
            major_label_overrides = {
                i: str(name) for i, name in enumerate(df_raw[col].unique())
            }
        pcp_axes.append(
            LinearAxis(
                fixed_location=index,
                y_range_name=col,
                ticker=fixedticks,
                formatter=tickformatter,
                major_label_overrides=major_label_overrides,
                name="pcp_axis"
            )
        )

    [pcp_plot.add_layout(axis, "right") for axis in pcp_axes]

    # Create x axis ticks depending of y axes positions
    # fixed_x_ticks = FixedTicker(ticks=np.arange(ndims), minor_ticks=[])
    pcp_x_ticks = PCPTicker(pcp_axes=pcp_axes, name="pcp_x_ticks")
    formatter_x_ticks = FuncTickFormatter(
        code="""
            return pcp_axes.filter(axis=>axis.fixed_location==tick)[0].y_range_name
        """,
        args={"pcp_axes": pcp_axes}
    )
    pcp_plot.xaxis.ticker = pcp_x_ticks
    pcp_plot.xaxis.formatter = formatter_x_ticks

    # create the data renderer ( MultiLine )
    # specify selected and non selected style

    # style when no selection is performed
    line_style = dict(
        line_color=kwargs.get("line_color", "#808080"),
        line_width=kwargs.get("line_width", 0.1),
        line_alpha=kwargs.get("line_alpha", 0.5)
    )

    # style when a selection is performed of the non selected lines
    non_selected_line_style = dict(
        line_color=kwargs.get("nonselection_line_color", "#808080"),
        line_width=kwargs.get("nonselection_line_width", 0.1),
        line_alpha=kwargs.get("nonselection_line_alpha", 0.5)
    )

    # style when a selection is performed of the selected lines
    selection_line_color = kwargs.get("selection_line_color", None)
    if selection_line_color is None:
        selection_line_color = {"field": "index", "transform": LinearColorMapper(low=df.index.min(), high=df.index.max(), palette=Viridis256)}

    selected_line_style = dict(
        line_color=selection_line_color,
        line_width=kwargs.get("selection_line_width", 1),
        line_alpha=kwargs.get("selection_line_alpha", 1)
    )

    #Multiline Renderer
    pcp_lines_renderer = pcp_plot.multi_line(
        xs="__xs", ys="__ys", source=data_source, name="pcp_lines_renderer", **line_style
    )

    # Specify selection style
    selected_lines = MultiLine(**selected_line_style)

    # Specify non selection style
    nonselected_lines = MultiLine(**non_selected_line_style)

    pcp_lines_renderer.selection_glyph = selected_lines
    pcp_lines_renderer.nonselection_glyph = nonselected_lines
    pcp_plot.y_range.start = pcp_plot.y_range.bounds[0]
    pcp_plot.y_range.end = pcp_plot.y_range.bounds[1]

    rect_source = ColumnDataSource({"x": [], "y": [], "width": [], "height": []})

    pcp_rect_glyph = Rect(
        x="x",
        y="y",
        width="width",
        height="height",
        line_color=kwargs.get("box_line_color","#000000"),
        line_width=kwargs.get("box_line_width",1),
        fill_alpha=kwargs.get("box_fill_alpha",0.7),
        fill_color=kwargs.get("box_fill_color","#009933"),
        name="pcp_rect_glyph"
    )
    pcp_selection_renderer = pcp_plot.add_glyph(rect_source, pcp_rect_glyph, name="pcp_selection_renderer")

    pcp_overlay = PCPBoxAnnotation(
        level="overlay",
        top_units="screen",
        left_units="screen",
        bottom_units="screen",
        right_units="screen",
        fill_color="lightgrey",
        fill_alpha=0.5,
        line_color="black",
        line_alpha=1.0,
        line_width=2,
        line_dash=[4, 4],
        name="pcp_overlay"
    )

    pcp_selection_tool = PCPSelectionTool(
        renderer_select=pcp_selection_renderer,
        renderer_data=pcp_lines_renderer,
        box_width=kwargs.get("box_width", 10),
        overlay=pcp_overlay,
        name="pcp_selection_tool"
    )

    # custom reset (reset only axes not selections)
    pcp_reset_axes = PCPResetTool(name="pcp_reset_axes")

    pcp_axes_move = PCPAxesMoveTool(name="pcp_axes_move", pcp_selection_tool=pcp_selection_tool)
    # add tools and activate selection ones
    extra_tools = list(kwargs.get("extra_tools", []))
    extra_tools += [pcp_axes_move, pcp_selection_tool, pcp_reset_axes]
    pcp_plot.add_tools(*extra_tools)
    pcp_plot.toolbar.active_drag = pcp_selection_tool
    return pcp_plot
