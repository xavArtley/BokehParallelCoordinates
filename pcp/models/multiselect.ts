import {select, option, div, span, createElement, input} from "@bokehjs/core/dom"
import {isString} from "@bokehjs/core/util/types"
import * as p from "@bokehjs/core/properties"

import {InputWidget, InputWidgetView} from "@bokehjs/models/widgets/input_widget"
import * as inputs from "@bokehjs/styles/widgets/inputs.css"

export declare const PCPmultiSelect: any

export class PCPMultiSelectView extends InputWidgetView {
  model: PCPMultiSelect

  protected input_el: HTMLSelectElement
  private logger: HTMLSpanElement
  private container: HTMLDivElement
  private elems: HTMLUListElement
  private searchbox: HTMLInputElement
  private selectall: HTMLLIElement
  private checkboxes: HTMLInputElement[]

  connect_signals(): void {
    super.connect_signals()
    this.on_change(this.model.properties.searchbox, () => {
      this._reset_search()
      this.searchbox.parentElement?.parentElement?.classList.toggle("hidden", !this.model.searchbox)
    })
    this.on_change(this.model.properties.selectall, () => {
      this.selectall.parentElement?.parentElement?.classList.toggle("hidden", !this.model.selectall)
    })
    this.on_change(this.model.properties.value, () => {
       console.log(this.model.value)
       this._set_values(this.model.value)
    })
    this.on_change(this.model.properties.theme, () => this._toggle_theme())
  }

  render(): void {
    super.render()
    const options = this.model.options.map((opt) => {
        let value, _label
        if (isString(opt))
          value = _label  = opt
        else
          [value, _label] = opt
        
        return option({
          value: value, 
          selected: this.model.value.includes(value)
        }, _label)
    })
    this.input_el = select({
        multiple: true,
        class: inputs.input,
        name: this.model.name,
        disabled: this.model.disabled,
        style: "width: 100%; display: none",
    }, options)

    // CONTAINER
    this.container = div(
      {
        class: "pcp_multiselect_container",
        style: "width: 100%; height: 100%;"
      }
    )

    //LOG SELECTED ITEMS
    this.logger = span({
      class: "logger bk-input",
      style: `
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-content: flex-start;
      `
    })
    
    // LIST OPTIONS
    this.elems = createElement("ul", {
      class: "pcp_multiselect hidden",
      style: "width: 100%"
    })

    this._create_search_box()
    this._create_select_all()
    
    this.checkboxes = []
    for (let i = 0; i < this.input_el.children.length; i++) {
      const child = <HTMLOptionElement> this.input_el.children[i]
      const labelEl = document.createElement('label')
      const liEl = document.createElement('li')
      const inputEl = input({
        type: "checkbox",
        value: child.value
      })
      inputEl.type = 'checkbox'
      inputEl.value = child.value

      const caption = document.createTextNode(child.innerText);

      liEl.appendChild(inputEl)
      liEl.appendChild(caption)

      liEl.className = child.selected ? 'active' : ''
      inputEl.checked = child.selected

      labelEl.appendChild(liEl)
      this.elems.appendChild(labelEl)
      this.checkboxes.push(inputEl)
    }
    this.elems.classList.toggle("hidden", true)

    this.container.appendChild(this.logger)
    this.container.appendChild(this.elems)

    this.group_el.appendChild(this.container)
    this.group_el.appendChild(this.input_el)
    this.group_el.appendChild(this.input_el)
    
    this._set_event_listeners()
    this._update_logger()
    this._toggle_theme()
  }

  _toggle_theme(): void {
    const theme = this.model.theme
    this.container.classList.toggle(theme, true)
    this.elems.classList.toggle(theme, true)
  }

  _create_search_box(): void {
    // SEARCH
    const labelSearchEl = document.createElement('label')
    labelSearchEl.classList.toggle("hidden", !this.model.searchbox)
    const liSearchEl = document.createElement('li')
    liSearchEl.className = "ignore"
    this.searchbox = input({
      type: "search",
      placeholder: "Search",
      class: "searchbox"
    })
    liSearchEl.appendChild(this.searchbox)
    labelSearchEl.appendChild(liSearchEl)
    this.elems.appendChild(labelSearchEl)
  }

  _create_select_all(): void {
    const labelSelAll = document.createElement('label')
    labelSelAll.classList.toggle("hidden", !this.model.selectall)
    const buttonElSelAll = document.createElement("button")
    buttonElSelAll.innerHTML = "Select all"
    buttonElSelAll.className = "select"
    const buttonElUnselAll = document.createElement("button")
    buttonElUnselAll.innerHTML = "Unselect all"
    buttonElUnselAll.className = "unselect"
    this.selectall = document.createElement('li')
    this.selectall.className = "ignore"
    this.selectall.appendChild(buttonElSelAll)
    this.selectall.appendChild(buttonElUnselAll)
    labelSelAll.appendChild(this.selectall)
    labelSelAll.classList.toggle("hidden", !this.model.selectall)
    this.elems.appendChild(labelSelAll);
  }

  _set_event_listeners(): void {
    
    document.addEventListener('click', (evt) => {
      if (!(evt.target && this.container.contains(<Node> evt.target)))
        this.elems.classList.add('hidden')
    })

    this.logger.addEventListener('click', () => {
      this.elems.classList.toggle('hidden')
      this.searchbox.focus()
    })

    this.searchbox.addEventListener('keyup', () => this._search())
    this.searchbox.addEventListener('search', () => this._search())
    this.selectall.querySelector("button.select")?.addEventListener('click', () => {
      this._udpate_values(this.all_values_visible, true)
    })
    this.selectall.querySelector("button.unselect")?.addEventListener('click', () => {
      this._udpate_values(this.all_values_visible, false)
    })


    let lastChecked: null | HTMLInputElement = null
    this.checkboxes.forEach(
      elem => {
        elem.addEventListener("click", (evt) => {
          const checkboxes_visible = this.checkboxes_visible
          if (lastChecked && evt.shiftKey) {
            const start = checkboxes_visible.indexOf(elem)
            const end = checkboxes_visible.indexOf(lastChecked)
            checkboxes_visible.slice(Math.min(start, end), Math.max(start, end)).map(
              item => {
                item.checked=lastChecked?.checked!
                item.parentElement?.classList.toggle("active", item.checked) 
              }
            )
            evt.stopImmediatePropagation()            
          }
          lastChecked = elem
          elem.parentElement?.classList.toggle("active", elem.checked)
          this._update_logger()
          this.model.value = this.values
        })
      }
    )

    // prevent text selection on dbl-click
    this.logger.addEventListener('mousedown', (evt) => evt.preventDefault(), false)
  }

  get search_value(): string {
    return this.searchbox.value.toLocaleLowerCase()
  }

  get values(): string[] {
    return this.checkboxes.filter(item => item.checked).map(item => item.value)
  }

  get all_values_visible(): string[] {
    return this.checkboxes_visible.map(item => item.value)
  }

  get checkboxes_visible(): HTMLInputElement[] {
    return this.checkboxes.filter(item => !item.parentElement?.parentElement?.classList.contains("hidden"))
  }

  get options(): HTMLLIElement[] {
    return Array.from(this.elems.querySelectorAll('li:not([class*=ignore])'))
  }

  _show_all_options(): void {
    this.options.map((li) => li.parentElement?.classList.toggle("hidden", false))
  }

  _filter_options(value: string): void {
    this.options.filter(
      opt => opt.innerText.toLocaleLowerCase().search(value) == -1
    ).map(
      opt => opt.parentElement?.classList.toggle("hidden", true)
    )
  }

  _reset_search(): void {
    this.searchbox.value = ""
    this._show_all_options()
  }

  _search(): void {
    this._show_all_options()
    this._filter_options(this.search_value)
  }

  _update_logger(): void {
    this.logger.innerHTML = ""
    this.options.filter(
      opt => (<HTMLInputElement> opt.querySelector("input[type=checkbox]")).checked
    ).map(
      opt =>  [opt.innerText, (<HTMLInputElement> opt.querySelector("input[type=checkbox]")).value]
    ).map(
      (lab_val) => {
        const labelEl = createElement("label", {
          class: "selectedLabels",
        })
        labelEl.innerHTML = lab_val[0]

        const closeEl = createElement("span", {
          class: 'closeBtn readOnly'
        })
        closeEl.innerHTML = '&#10005;'
        closeEl.dataset.id = lab_val[1]
        closeEl.addEventListener('click', (event) => {
          event.stopPropagation();
          this._remove_value(closeEl.dataset.id!)
        })
        labelEl.appendChild(closeEl)
        this.logger.appendChild(labelEl)
      }
    )
  }

  _unchecked_all(): void {
    this.options.map(
      opt => (<HTMLInputElement> opt.querySelector("input[type=checkbox]")).checked = false
    )
  }

  _udpate_values(values: string[], checked: boolean): void {
    this.options.filter(
      opt => values.includes((<HTMLInputElement> opt.querySelector("input[type=checkbox]")).value)
    ).map(
      opt => {
        const elem = (<HTMLInputElement> opt.querySelector("input[type=checkbox]"))
        elem.checked = checked
        elem.parentElement?.classList.toggle("active", checked)
      }
    )
    this._update_logger()
    if (this.values != this.model.value)
      this.model.value = this.values
  }

  _remove_values(values: string[]): void {
    this._udpate_values(values, false)
    this._update_logger()
    if (this.values != this.model.value)
      this.model.value = this.values
  }

  _set_values(values: string[]): void {
    this._unchecked_all()
    this._udpate_values(values, true)
  }

  _remove_value(value: string): void {
    this._remove_values([value])
  }
}


export namespace PCPMultiSelect {
    export type Attrs = p.AttrsOf<Props>
  
    export type Props = InputWidget.Props & {
      searchbox: p.Property<boolean>
      selectall: p.Property<boolean>
      value: p.Property<string[]>
      options: p.Property<(string | [string, string])[]>
      theme: p.Property<string>
    }
  }
  
  export interface PCPMultiSelect extends PCPMultiSelect.Attrs {}
  
  export class PCPMultiSelect extends InputWidget {
    properties: PCPMultiSelect.Props
    __view_type__: PCPMultiSelectView
  
    static __module__ = "pcp.models.multiselect"

    constructor(attrs?: Partial<PCPMultiSelect.Attrs>) {
      super(attrs)
    }
  
    static init_PCPMultiSelect(): void {
      this.prototype.default_view = PCPMultiSelectView
  
      this.define<PCPMultiSelect.Props>(({Boolean, String, Array, Tuple, Or}) => ({
        searchbox: [Boolean, true],
        selectall: [Boolean, true],
        value:   [ Array(String), [] ],
        options: [ Array(Or(String, Tuple(String, String))), [] ],
        theme: [ String, "light" ],
      }))
    }
  }
  