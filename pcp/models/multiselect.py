from bokeh.core.properties import List, String, Either, Tuple, Bool
from bokeh.models import InputWidget


class PCPMultiSelect(InputWidget):
    ''' Multi-select widget.

    '''

    searchbox = Bool(default=True)

    selectall = Bool(default=True)

    options = List(Either(String, Tuple(String, String)), help="""
    Available selection options. Options may be provided either as a list of
    possible string values, or as a list of tuples, each of the form
    ``(value, label)``. In the latter case, the visible widget text for each
    value will be corresponding given label.
    """)

    value = List(String, help="""
    Initial or selected values.
    """)

    theme = String(default="light")
