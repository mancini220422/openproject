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

export default class PreviewController extends DialogPreviewController {
  markFieldAsTouched(event:{ target:HTMLInputElement }) {
    super.markFieldAsTouched(event);

    if (this.isWorkBasedMode()) {
      this.keepWorkValue();
    }
  }

  // Ensures that on create forms, there is an "id" for the un-persisted
  // work package when sending requests to the edit action for previews.
  ensureValidPathname(formAction:string):string {
    const wpPath = new URL(formAction);

    if (wpPath.pathname.endsWith('/work_packages/progress')) {
      // Replace /work_packages/progress with /work_packages/new/progress
      wpPath.pathname = wpPath.pathname.replace('/work_packages/progress', '/work_packages/new/progress');
    }

    return wpPath.toString();
  }

  ensureValidWpAction(wpPath:string):string {
    return wpPath.endsWith('/work_packages/new/progress') ? 'new' : 'edit';
  }

  private isWorkBasedMode() {
    return super.findValueInput('done_ratio') !== undefined;
  }

  private keepWorkValue() {
    if (super.isInitialValueEmpty('estimated_hours') && !super.isTouched('estimated_hours')) {
      // let work be derived
      return;
    }

    if (super.isBeingEdited('estimated_hours')) {
      this.untouchFieldsWhenWorkIsEdited();
    } else if (super.isBeingEdited('remaining_hours')) {
      this.untouchFieldsWhenRemainingWorkIsEdited();
    } else if (super.isBeingEdited('done_ratio')) {
      this.untouchFieldsWhenPercentCompleteIsEdited();
    }
  }

  private untouchFieldsWhenWorkIsEdited() {
    if (this.areBothTouched('remaining_hours', 'done_ratio')) {
      if (super.isValueEmpty('done_ratio') && super.isValueEmpty('remaining_hours')) {
        return;
      }
      if (super.isValueEmpty('done_ratio')) {
        super.markUntouched('done_ratio');
      } else {
        super.markUntouched('remaining_hours');
      }
    } else if (super.isTouchedAndEmpty('remaining_hours') && super.isValueSet('done_ratio')) {
      // force remaining work derivation
      super.markUntouched('remaining_hours');
      super.markTouched('done_ratio');
    } else if (super.isTouchedAndEmpty('done_ratio') && super.isValueSet('remaining_hours')) {
      // force % complete derivation
      super.markUntouched('done_ratio');
      super.markTouched('remaining_hours');
    }
  }

  private untouchFieldsWhenRemainingWorkIsEdited():void {
    if (super.isTouchedAndEmpty('estimated_hours') && super.isValueSet('done_ratio')) {
      // force work derivation
      super.markUntouched('estimated_hours');
      super.markTouched('done_ratio');
    } else if (super.isValueSet('estimated_hours')) {
      super.markUntouched('done_ratio');
    }
  }

  private untouchFieldsWhenPercentCompleteIsEdited():void {
    if (super.isValueSet('estimated_hours')) {
      super.markUntouched('remaining_hours');
    }
  }

  private areBothTouched(fieldName1:string, fieldName2:string):boolean {
    return super.isTouched(fieldName1) && super.isTouched(fieldName2);
  }
}
