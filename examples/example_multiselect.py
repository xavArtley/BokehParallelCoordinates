import panel as pn
from bokeh.models import MultiSelect
from pcp.models.multiselect import MSFMultiSelect
from bokeh.sampledata.airports import data

options = [(str(i),str(n)) for i,n in zip(data["name"].index, data["name"])]

m1 = MSFMultiSelect(options=options, height=400, width=400)
m2 = MultiSelect(options=options)

m1.on_change("value", lambda attr, old, new: setattr(m2,"value", new))
m1.on_change("value", lambda attr, old, new: print("m1", old, new))
m2.on_change("value", lambda attr, old, new: setattr(m1,"value", new))
m2.on_change("value", lambda attr, old, new: print("m2", old, new))
pn.Row(m1,m2).show()
