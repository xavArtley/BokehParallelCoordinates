import {BoxAnnotation, BoxAnnotationView} from "@bokehjs/models/annotations/box_annotation"

import * as p from "@bokehjs/core/properties"

export class PCPBoxAnnotationView extends BoxAnnotationView {
  model: BoxAnnotation

}

export namespace PCPBoxAnnotation {
  export type Attrs = p.AttrsOf<Props>

  export type Props = BoxAnnotation.Props
}

export interface PCPBoxAnnotation extends PCPBoxAnnotation.Attrs {}

export class PCPBoxAnnotation extends BoxAnnotation {
  properties: PCPBoxAnnotation.Props
  __view_type__: PCPBoxAnnotationView

  static __module__ = "pcp.models.pcp_box_annotation"

  static init_PCPBoxAnnotation(): void {
    this.prototype.default_view = PCPBoxAnnotationView
  }
}
