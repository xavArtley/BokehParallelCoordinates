import panel as pn
from bokeh.models import MultiSelect, CustomJS
from pcp.models.multiselect import MSFMultiSelect
from bokeh.sampledata.airports import data

options = [(str(i),str(n)) for i,n in zip(data["name"].index, data["name"])]

m1 = MSFMultiSelect(options=options, height=80, width=400)
m2 = MultiSelect(options=options)
t = pn.widgets.Toggle(name="search")
t.jslink(m1, value="searchbox")

# m1.on_change("value", lambda attr, old, new: setattr(m2,"value", new))
cb1 = CustomJS(args=dict(m2=m2), code="m2.value = cb_obj.value")
m1.js_on_change("value", cb1)
m1.on_change("value", lambda attr, old, new: print("m1", old, new))
cb2 = CustomJS(args=dict(m1=m1), code="m1.value = cb_obj.value")
# m2.on_change("value", lambda attr, old, new: setattr(m1,"value", new))
m2.js_on_change("value", cb2)
m2.on_change("value", lambda attr, old, new: print("m2", old, new))
pn.Row(m1,m2,t).show()
