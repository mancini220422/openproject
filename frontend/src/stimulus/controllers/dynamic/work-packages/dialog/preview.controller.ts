/*
 * -- copyright
 * OpenProject is an open source project management software.
 * Copyright (C) the OpenProject GmbH
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License version 3.
 *
 * OpenProject is a fork of ChiliProject, which is a fork of Redmine. The copyright follows:
 * Copyright (C) 2006-2013 Jean-Philippe Lang
 * Copyright (C) 2010-2013 the ChiliProject Team
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 *
 * See COPYRIGHT and LICENSE files for more details.
 * ++
 */

import { Controller } from '@hotwired/stimulus';
import {
  debounce,
  DebouncedFunc,
} from 'lodash';
import Idiomorph from 'idiomorph/dist/idiomorph.cjs';

interface TurboBeforeFrameRenderEventDetail {
  render:(currentElement:HTMLElement, newElement:HTMLElement) => void;
}

interface HTMLTurboFrameElement extends HTMLElement {
  src:string;
}

export abstract class DialogPreviewController extends Controller {
  static targets = [
    'form',
    'fieldInput',
    'initialValueInput',
    'touchedFieldInput',
  ];

  declare readonly fieldInputTargets:HTMLInputElement[];
  declare readonly formTarget:HTMLFormElement;
  declare readonly initialValueInputTargets:HTMLInputElement[];
  declare readonly touchedFieldInputTargets:HTMLInputElement[];

  private debouncedPreview:DebouncedFunc<(event:Event) => void>;
  private frameMorphRenderer:(event:CustomEvent<TurboBeforeFrameRenderEventDetail>) => void;
  private targetFieldName:string;
  private touchedFields:Set<string>;

  connect() {
    this.touchedFields = new Set();
    this.touchedFieldInputTargets.forEach((input) => {
      const fieldName = input.dataset.referrerField;
      if (fieldName && input.value === 'true') {
        this.touchedFields.add(fieldName);
      }
    });

    // if the debounce value is changed, the following test helper must be kept
    // in sync: `spec/support/edit_fields/progress_edit_field.rb`, method `#wait_for_preview_to_complete`
    this.debouncedPreview = debounce((event:Event) => { void this.preview(event); }, 200);

    // Turbo supports morphing, by adding the <turbo-frame refresh="morph">
    // attribute. However, it does not work that well with primer input: when
    // adding "data-turbo-permanent" to keep value and focus on the active
    // element, it also keeps the `aria-describedby` attribute which references
    // caption and validation element ids. As these elements are morphed and get
    // new ids, the ids referenced by `aria-describedby` are stale. This makes
    // caption and validation message unaccessible for screen readers and other
    // assistive technologies. This is why morph cannot be used here.
    this.frameMorphRenderer = (event:CustomEvent<TurboBeforeFrameRenderEventDetail>) => {
      event.detail.render = (currentElement:HTMLElement, newElement:HTMLElement) => {
        Idiomorph.morph(currentElement, newElement, {
          ignoreActiveValue: true,
          callbacks: {
            beforeNodeMorphed: (oldNode:Element) => {
              // In case the element is an OpenProject custom dom element, morphing is prevented.
              return !oldNode.tagName?.startsWith('OPCE-');
            },
            afterNodeMorphed: (oldNode:Element, newNode:Element) => {
              if (newNode.tagName === 'INPUT' && (newNode as HTMLInputElement).name && (newNode as HTMLInputElement).name.startsWith('work_package[')) {
                this.dispatchChangeEvent((newNode as HTMLInputElement));
              }
            },
          },
        });
      };
    };

    this.fieldInputTargets.forEach((target) => {
      if (target.tagName.toLowerCase() === 'select') {
        target.addEventListener('change', this.debouncedPreview);
      } else {
        target.addEventListener('input', this.debouncedPreview);
      }

      if (target.dataset.focus === 'true') {
        this.focusAndSetCursorPositionToEndOfInput(target);
      }
    });

    const turboFrame = this.formTarget.closest('turbo-frame') as HTMLTurboFrameElement;
    turboFrame.addEventListener('turbo:before-frame-render', this.frameMorphRenderer);
  }

  disconnect() {
    this.debouncedPreview.cancel();
    this.fieldInputTargets.forEach((target) => {
      if (target.tagName.toLowerCase() === 'select') {
        target.removeEventListener('change', this.debouncedPreview);
      } else {
        target.removeEventListener('input', this.debouncedPreview);
      }
    });
    const turboFrame = this.formTarget.closest('turbo-frame') as HTMLTurboFrameElement;
    if (turboFrame) {
      turboFrame.removeEventListener('turbo:before-frame-render', this.frameMorphRenderer);
    }
  }

  protected cancel():void {
    document.dispatchEvent(new CustomEvent('cancelModalWithTurboContent'));
  }

  markFieldAsTouched(event:{ target:HTMLInputElement }) {
    this.targetFieldName = event.target.name.replace(/^work_package\[([^\]]+)\]$/, '$1');
    this.markTouched(this.targetFieldName);
  }

  async preview(event:Event) {
    let field:HTMLInputElement;
    if (event.type === 'blur') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      field = (event as FocusEvent).relatedTarget as HTMLInputElement;
    } else {
      field = event.target as HTMLInputElement;
    }

    const form = this.formTarget;
    const formData = new FormData(form) as unknown as undefined;
    const formParams = new URLSearchParams(formData);

    const wpParams = Array.from(formParams.entries())
      .filter(([key, _]) => key.startsWith('work_package'));
    wpParams.push(['field', field?.name ?? '']);

    const wpPath = this.ensureValidPathname(form.action);
    const wpAction = this.ensureValidWpAction(wpPath);

    const editUrl = `${wpPath}/${wpAction}?${new URLSearchParams(wpParams).toString()}`;
    const turboFrame = this.formTarget.closest('turbo-frame') as HTMLTurboFrameElement;

    if (turboFrame) {
      turboFrame.src = editUrl;
    }
  }

  private focusAndSetCursorPositionToEndOfInput(field:HTMLInputElement) {
    field.focus();
    field.setSelectionRange(
      field.value.length,
      field.value.length,
    );
  }

  abstract ensureValidPathname(formAction:string):string;

  abstract ensureValidWpAction(path:string):string;

  abstract dispatchChangeEvent(field:HTMLInputElement|null):void;

  protected isBeingEdited(fieldName:string) {
    return fieldName === this.targetFieldName;
  }

  // Finds the hidden initial value input based on a field name.
  //
  // The initial value input field holds the initial value of the work package
  // before being set by the user or derived.
  private findInitialValueInput(fieldName:string):HTMLInputElement|undefined {
    return this.initialValueInputTargets.find((input) =>
      (input.dataset.referrerField === fieldName));
  }

  // Finds the value field input based on a field name.
  //
  // The value field input holds the current value of a field.
  protected findValueInput(fieldName:string):HTMLInputElement|undefined {
    return this.fieldInputTargets.find((input) =>
      (input.name === fieldName) || (input.name === `work_package[${fieldName}]`));
  }

  protected isTouchedAndEmpty(fieldName:string):boolean {
    return this.isTouched(fieldName) && this.isValueEmpty(fieldName);
  }

  protected isTouched(fieldName:string):boolean {
    return this.touchedFields.has(fieldName);
  }

  protected isInitialValueEmpty(fieldName:string):boolean {
    const valueInput = this.findInitialValueInput(fieldName);
    return valueInput?.value === '';
  }

  protected isValueEmpty(fieldName:string):boolean {
    const valueInput = this.findValueInput(fieldName);
    return valueInput?.value === '';
  }

  protected isValueSet(fieldName:string):boolean {
    const valueInput = this.findValueInput(fieldName);
    return valueInput !== undefined && valueInput.value !== '';
  }

  protected markTouched(fieldName:string):void {
    this.touchedFields.add(fieldName);
    this.updateTouchedFieldHiddenInputs();
  }

  protected markUntouched(fieldName:string):void {
    this.touchedFields.delete(fieldName);
    this.updateTouchedFieldHiddenInputs();
  }

  private updateTouchedFieldHiddenInputs():void {
    this.touchedFieldInputTargets.forEach((input) => {
      const fieldName = input.dataset.referrerField;
      if (fieldName) {
        input.value = this.isTouched(fieldName) ? 'true' : 'false';
      }
    });
  }
}
