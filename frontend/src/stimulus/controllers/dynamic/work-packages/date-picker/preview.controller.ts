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

import { DialogPreviewController } from '../dialog/preview.controller';
import { TimezoneService } from 'core-app/core/datetime/timezone.service';

export default class PreviewController extends DialogPreviewController {
  private timezoneService:TimezoneService;

  async connect() {
    super.connect();

    const context = await window.OpenProject.getPluginContext();
    this.timezoneService = context.services.timezone;
  }

  markFieldAsTouched(event:{ target:HTMLInputElement }) {
    super.markFieldAsTouched(event);
  }

  // Ensures that on create forms, there is an "id" for the un-persisted
  // work package when sending requests to the edit action for previews.
  ensureValidPathname(formAction:string):string {
    const wpPath = new URL(formAction);

    if (wpPath.pathname.endsWith('/work_packages/datepicker_dialog_content')) {
      // Replace /work_packages/date_picker with /work_packages/new/date_picker
      wpPath.pathname = wpPath.pathname.replace('/work_packages/datepicker_dialog_content', '/work_packages/new/datepicker_dialog_content');
    }

    return wpPath.toString();
  }

  ensureValidWpAction(wpPath:string):string {
    return wpPath.endsWith('/work_packages/new/datepicker_dialog_content') ? 'new' : 'edit';
  }

  dispatchChangeEvent(field:HTMLInputElement) {
    document.dispatchEvent(
      new CustomEvent('date-picker:input-changed', {
        detail: {
          field: field.name,
          value: this.getValueFor(field),
        },
      }),
    );
  }

  private getValueFor(field:HTMLInputElement):string {
    if (field.type === 'checkbox') {
      return field.checked.toString();
    }

    return field.value;
  }

  highlightField(e:Event) {
    const newHighlightedField = e.target;
    if (newHighlightedField) {
      Array.from(document.getElementsByClassName('op-datepicker-modal--date-field_current')).forEach(
        (el) => {
          el.classList.remove('op-datepicker-modal--date-field_current');
          el.removeAttribute('data-qa-highlighted');
        },
      );

      (newHighlightedField as HTMLInputElement).classList.add('op-datepicker-modal--date-field_current');
      (newHighlightedField as HTMLInputElement).dataset.qaHighlighted = 'true';

      document.dispatchEvent(
        new CustomEvent('date-picker:input-focused', {
          detail: {
            field: (newHighlightedField as HTMLInputElement).name,
          },
        }),
      );
    }
  }

  setTodayForField(event:unknown) {
    (event as Event).preventDefault();

    const targetFieldID = (event as { params:{ fieldReference:string } }).params.fieldReference;
    if (targetFieldID) {
      const inputField = document.getElementById(targetFieldID);
      if (inputField) {
        (inputField as HTMLInputElement).value = this.timezoneService.formattedISODate(Date.now());
        inputField.dispatchEvent(new Event('input'));
      }
    }
  }
}
