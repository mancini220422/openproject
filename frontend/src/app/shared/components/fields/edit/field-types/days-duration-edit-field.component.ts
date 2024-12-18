/*
 *  OpenProject is an open source project management software.
 *  Copyright (C) the OpenProject GmbH
 *
 *  This program is free software; you can redistribute it and/or
 *  modify it under the terms of the GNU General Public License version 3.
 *
 *  OpenProject is a fork of ChiliProject, which is a fork of Redmine. The copyright follows:
 *  Copyright (C) 2006-2013 Jean-Philippe Lang
 *  Copyright (C) 2010-2013 the ChiliProject Team
 *
 *  This program is free software; you can redistribute it and/or
 *  modify it under the terms of the GNU General Public License
 *  as published by the Free Software Foundation; either version 2
 *  of the License, or (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, write to the Free Software
 *  Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 *
 *  See COPYRIGHT and LICENSE files for more details.
 */

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  Injector,
  OnInit,
} from '@angular/core';
import { DatePickerEditFieldComponent } from 'core-app/shared/components/fields/edit/field-types/date-picker-edit-field.component';
import * as moment from 'moment-timezone';
import { I18nService } from 'core-app/core/i18n/i18n.service';
import {
  OpEditingPortalChangesetToken,
  OpEditingPortalHandlerToken,
  OpEditingPortalSchemaToken,
} from 'core-app/shared/components/fields/edit/edit-field.component';
import { ResourceChangeset } from 'core-app/shared/components/fields/changeset/resource-changeset';
import { HalResource } from 'core-app/features/hal/resources/hal-resource';
import { IFieldSchema } from 'core-app/shared/components/fields/field.base';
import { EditFieldHandler } from 'core-app/shared/components/fields/edit/editing-portal/edit-field-handler';
import { PathHelperService } from 'core-app/core/path-helper/path-helper.service';

@Component({
  templateUrl: './days-duration-edit-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DaysDurationEditFieldComponent extends DatePickerEditFieldComponent implements OnInit{
  opened = false;

  public get formattedValue():number {
    return Number(moment.duration(this.value).asDays().toFixed(0));
  }

  ngOnInit():void {
    super.ngOnInit();
  }

  onInputClick(event:MouseEvent) {
    event.stopPropagation();
  }

  showDatePickerModal() {
    this.opened = true;
  }

  onModalClosed() {
    this.handler.handleUserSubmit();
    this.opened = false;
  }

  cancel():void {
    this.handler.reset();
    this.opened = false;
  }
}
