import panel as pn
from pcp.indicators import ArcProgressIndicator

indicator = ArcProgressIndicator(progress=10, background="#efebeb", 
                                 use_gradient=True, text_style={"fill": "gray"},
                                 format_options={"style": "decimal"},
                                 viewbox=[-2, -2, 24, 11],
                                 annotations=[{"progress": 0, "text": "0%", "tick_width": 0.2, "text_size": 0.8},
                                              {"progress": 10, "text": "10%", "tick_width": 0.1, "text_size": 1},
                                              {"progress": 100, "text": "100%", "tick_width": 0.2, "text_size": 0.8}
                                             ],
                                 gradient=[{"stop": 0, "color": "blue"}, {"stop": 1, "color": "red"}]
                                )
pn.Row(
    indicator.controls()[0],
    indicator
).show()