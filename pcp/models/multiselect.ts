import {select, option} from "@bokehjs/core/dom"
import {isString} from "@bokehjs/core/util/types"
import * as p from "@bokehjs/core/properties"

import {InputWidget, InputWidgetView} from "@bokehjs/models/widgets/input_widget"
import * as inputs from "@bokehjs/styles/widgets/inputs.css"

export declare const MSFmultiSelect: any

export class MSFMultiSelectView extends InputWidgetView {
  model: MSFMultiSelect

  protected input_el: HTMLSelectElement
  protected msfselect: any

  connect_signals(): void {
    super.connect_signals()
    this.on_change(this.model.properties.value, () => {
        const _old = <string[]> this.msfselect.getData()
        const _new = this.model.value
        const values_to_set = _new.filter(item => !_old.includes(item))
        const values_to_remove = _old.filter(item => !_new.includes(item))
        if (values_to_remove.length>0)
          this.msfselect.removeValue(values_to_remove)
        if (values_to_set.length>0)
          this.msfselect.setValue(values_to_set)
    })
  }

  render(): void {
    super.render()
    const options = this.model.options.map((opt) => {
        let value, _label
        if (isString(opt))
          value = _label  = opt
        else
          [value, _label] = opt
  
        return option({value}, _label)
    })
    this.input_el = select({
        multiple: true,
        class: inputs.input,
        name: this.model.name,
        disabled: this.model.disabled,
        style: "width: 100%",
    }, options)

    this.group_el.appendChild(this.input_el)
    this.msfselect = new MSFmultiSelect(this.input_el, {
        theme: "theme2",
        selectAll: true,
        searchBox: true,
        width: "100%",
        height: "100%",
        onChange: () => this.model.value = this.msfselect.getData(),
        afterSelectAll: () => this.model.value = this.msfselect.getData()
    })
    this.msfselect.setValue(this.model.value)
    this.msfselect.container.style.width = "100%"
    this.msfselect.container.style.height = "100%"
    this.msfselect.logger.classList.add("bk-input")
    this.msfselect.logger.style.display = "flex"
    this.msfselect.logger.style.flexDirection = "row"
    this.msfselect.logger.style.flexWrap = "wrap"
    this.msfselect.logger.style.alignContent = "flex-start"
  }
}


export namespace MSFMultiSelect {
    export type Attrs = p.AttrsOf<Props>
  
    export type Props = InputWidget.Props & {
      value: p.Property<string[]>
      options: p.Property<(string | [string, string])[]>
    }
  }
  
  export interface MSFMultiSelect extends MSFMultiSelect.Attrs {}
  
  export class MSFMultiSelect extends InputWidget {
    properties: MSFMultiSelect.Props
    __view_type__: MSFMultiSelectView
  
    static __module__ = "pcp.models.multiselect"

    constructor(attrs?: Partial<MSFMultiSelect.Attrs>) {
      super(attrs)
    }
  
    static init_MSFMultiSelect(): void {
      this.prototype.default_view = MSFMultiSelectView
  
      this.define<MSFMultiSelect.Props>(({String, Array, Tuple, Or}) => ({
        value:   [ Array(String), [] ],
        options: [ Array(Or(String, Tuple(String, String))), [] ],
      }))
    }
  }
  