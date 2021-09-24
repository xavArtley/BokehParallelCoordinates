import * as p from "@bokehjs/core/properties"
import {Ticker, TickSpec} from "@bokehjs/models/tickers/ticker"
import {Range} from "@bokehjs/models/ranges/range"
import {Axis} from "@bokehjs/models/axes/axis"




export namespace PCPTicker {
  export type Attrs = p.AttrsOf<Props>

  export type Props = Ticker.Props & {
    pcp_axes: p.Property<Axis[]>
  }
}

export interface PCPTicker extends PCPTicker.Attrs {}

export class PCPTicker extends Ticker {
  properties: PCPTicker.Props

  constructor(attrs?: Partial<PCPTicker.Attrs>) {
    super(attrs)
  }

  static __module__ = "pcp.models.pcp_ticker"

  static init_PCPTicker(): void {
    this.define<PCPTicker.Props>(({Ref, Array}) => ({
      pcp_axes: [Array(Ref(Axis)), []],
    }))
  }

  get_ticks(data_low: number, data_high: number, _range: Range, _cross_loc: number): TickSpec<number> {
    const major = this.pcp_axes.filter(axis => axis.fixed_location! > data_low && axis.fixed_location! < data_high)
      .map(axis => <number>axis.fixed_location!)
    return {
      major: major,
      minor: [],
    }
  }
}
