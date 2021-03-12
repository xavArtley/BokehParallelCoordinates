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
from bokeh.plotting import figure

from .models import PCPBoxAnnotation, PCPSelectionTool, PCPResetTool


def parallel_plot(df_raw, drop=None, color=None, palette=None):
    """From a dataframe create a parallel coordinate plot"""
    if drop is not None:
        df = df_raw.drop(drop, axis=1)
    else:
        df = df_raw.copy()
    npts = df.shape[0]
    ndims = len(df.columns)

    if color is None:
        color = np.ones(npts)
    if palette is None:
        palette = ["#ff0000"]
    if color.dtype == np.object_:
        color = color.apply(lambda elem: np.where(color.unique() == elem)[0].item())
    cmap = LinearColorMapper(high=color.min(), low=color.max(), palette=palette)
    categorical_columns = df.columns.where(df.dtypes == np.object_).dropna()
    for col in categorical_columns:
        df[col] = df[col].apply(
            lambda elem: np.where(df[col].unique() == elem)[0].item()
        )

    data_source = ColumnDataSource(
        dict(
            xs=np.arange(ndims)[None, :].repeat(npts, axis=0).tolist(),
            ys=np.array((df - df.min()) / (df.max() - df.min())).tolist(),
            color=color,
        )
    )

    p = figure(x_range=(-1, ndims), y_range=(0, 1), width=1000, tools="pan, box_zoom", output_backend="webgl")

    # Create x axis ticks from columns contained in dataframe
    fixed_x_ticks = FixedTicker(ticks=np.arange(ndims), minor_ticks=[])
    formatter_x_ticks = FuncTickFormatter(
        code="return columns[index]", args={"columns": df.columns}
    )
    p.xaxis.ticker = fixed_x_ticks
    p.xaxis.formatter = formatter_x_ticks

    p.yaxis.visible = False
    p.y_range.start = 0
    p.y_range.end = 1
    p.y_range.bounds = (-0.1, 1.1)  # add a little padding around y axis
    p.xgrid.visible = False
    p.ygrid.visible = False

    # Create extra y axis for each dataframe column
    tickformatter = BasicTickFormatter(precision=1)
    for index, col in enumerate(df.columns):
        start = df[col].min()
        end = df[col].max()
        bound_min = start + abs(end - start) * (p.y_range.bounds[0] - p.y_range.start)
        bound_max = end + abs(end - start) * (p.y_range.bounds[1] - p.y_range.end)
        range1d = Range1d(start=bound_min, end=bound_max, bounds=(bound_min, bound_max))
        p.extra_y_ranges.update({col: range1d})
        if col not in categorical_columns:
            fixedticks = FixedTicker(ticks=np.linspace(start, end, 8), minor_ticks=[])
            major_label_overrides = {}
        else:
            fixedticks = FixedTicker(ticks=np.arange(end + 1), minor_ticks=[])
            major_label_overrides = {
                i: str(name) for i, name in enumerate(df_raw[col].unique())
            }

        p.add_layout(
            LinearAxis(
                fixed_location=index,
                y_range_name=col,
                ticker=fixedticks,
                formatter=tickformatter,
                major_label_overrides=major_label_overrides,
            ),
            "right",
        )

    # create the data renderer ( MultiLine )
    # specify selected and non selected style
    non_selected_line_style = dict(line_color="grey", line_width=0.1, line_alpha=0.5)

    selected_line_style = dict(
        line_color={"field": "color", "transform": cmap}, line_width=1
    )

    parallel_renderer = p.multi_line(
        xs="xs", ys="ys", source=data_source, **non_selected_line_style
    )

    # Specify selection style
    selected_lines = MultiLine(**selected_line_style)

    # Specify non selection style
    nonselected_lines = MultiLine(**non_selected_line_style)

    parallel_renderer.selection_glyph = selected_lines
    parallel_renderer.nonselection_glyph = nonselected_lines
    p.y_range.start = p.y_range.bounds[0]
    p.y_range.end = p.y_range.bounds[1]

    rect_source = ColumnDataSource({"x": [], "y": [], "width": [], "height": []})

    rect_glyph = Rect(
        x="x",
        y="y",
        width="width",
        height="height",
        fill_alpha=0.7,
        fill_color="#009933",
    )
    selection_renderer = p.add_glyph(rect_source, rect_glyph)

    overlay = PCPBoxAnnotation(
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
    )
    selection_tool = PCPSelectionTool(
        renderer_select=selection_renderer,
        renderer_data=parallel_renderer,
        box_width=10,
        overlay=overlay,
    )
    # custom resets (reset only axes not selections)
    reset_axes = PCPResetTool()

    # add tools and activate selection ones
    p.add_tools(selection_tool, reset_axes, TapTool(), WheelZoomTool())
    p.toolbar.active_drag = selection_tool
    p.toolbar.active_tap = None
    return p
