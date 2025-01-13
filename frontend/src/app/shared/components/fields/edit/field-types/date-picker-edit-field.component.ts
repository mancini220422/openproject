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
  Directive,
  OnDestroy,
  OnInit,
  Injector,
  ElementRef,
  Inject,
  ChangeDetectorRef,
} from '@angular/core';
import { InjectField } from 'core-app/shared/helpers/angular/inject-field.decorator';
import { TimezoneService } from 'core-app/core/datetime/timezone.service';
import {
  EditFieldComponent,
  OpEditingPortalChangesetToken,
  OpEditingPortalHandlerToken,
  OpEditingPortalSchemaToken,
} from 'core-app/shared/components/fields/edit/edit-field.component';
import { DeviceService } from 'core-app/core/browser/device.service';
import { PathHelperService } from 'core-app/core/path-helper/path-helper.service';
import { I18nService } from 'core-app/core/i18n/i18n.service';
import { ResourceChangeset } from 'core-app/shared/components/fields/changeset/resource-changeset';
import { HalResource } from 'core-app/features/hal/resources/hal-resource';
import { IFieldSchema } from 'core-app/shared/components/fields/field.base';
import { EditFieldHandler } from 'core-app/shared/components/fields/edit/editing-portal/edit-field-handler';

@Directive()
export abstract class DatePickerEditFieldComponent extends EditFieldComponent implements OnInit, OnDestroy {
  @InjectField() readonly timezoneService:TimezoneService;

  @InjectField() deviceService:DeviceService;

  turboFrameSrc:string;

  constructor(
    readonly I18n:I18nService,
    readonly elementRef:ElementRef,
    @Inject(OpEditingPortalChangesetToken) protected change:ResourceChangeset<HalResource>,
    @Inject(OpEditingPortalSchemaToken) public schema:IFieldSchema,
    @Inject(OpEditingPortalHandlerToken) readonly handler:EditFieldHandler,
    readonly cdRef:ChangeDetectorRef,
    readonly injector:Injector,
    readonly pathHelper:PathHelperService,
  ) {
    super(I18n, elementRef, change, schema, handler, cdRef, injector);
  }

  ngOnInit():void {
    super.ngOnInit();
    this.turboFrameSrc = `${this.pathHelper.workPackageDatepickerDialogContentPath(this.change.id)}?field=${this.name}`;

    this.handler
      .$onUserActivate
      .pipe(
        this.untilDestroyed(),
      )
      .subscribe(() => {
        this.showDatePickerModal();
      });
  }

  ngOnDestroy():void {
    super.ngOnDestroy();
  }

  public showDatePickerModal():void { }

  public handleSuccessfulCreate(JSONResponse:{ duration:number, startDate:Date, dueDate:Date, includeNonWorkingDays:boolean, scheduleManually:boolean }):void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
    this.resource.duration = JSONResponse.duration ? this.timezoneService.toISODuration(JSONResponse.duration, 'days') : null;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
    this.resource.dueDate = JSONResponse.dueDate;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
    this.resource.startDate = JSONResponse.startDate;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
    this.resource.includeNonWorkingDays = JSONResponse.includeNonWorkingDays;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
    this.resource.scheduleManually = JSONResponse.scheduleManually;

    this.onModalClosed();
  }

  public handleSuccessfulUpdate():void {
    this.onModalClosed();
  }

  public onModalClosed():void { }

  public updateFrameSrc():void {
    const url = new URL(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      this.pathHelper.workPackageDatepickerDialogContentPath(this.resource.id as string),
      window.location.origin,
    );

    url.searchParams.set('field', this.name);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-member-access
    url.searchParams.set('work_package[initial][start_date]', this.nullAsEmptyStringFormatter(this.resource.startDate));
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-member-access
    url.searchParams.set('work_package[initial][due_date]', this.nullAsEmptyStringFormatter(this.resource.dueDate));
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-member-access
    url.searchParams.set('work_package[initial][duration]', this.nullAsEmptyStringFormatter(this.resource.duration));
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    url.searchParams.set('work_package[initial][ignore_non_working_days]', this.nullAsEmptyStringFormatter(this.resource.includeNonWorkingDays));

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-member-access
    url.searchParams.set('work_package[start_date]', this.nullAsEmptyStringFormatter(this.resource.startDate));
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-member-access
    url.searchParams.set('work_package[due_date]', this.nullAsEmptyStringFormatter(this.resource.dueDate));
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-member-access
    url.searchParams.set('work_package[duration]', this.nullAsEmptyStringFormatter(this.resource.duration));
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    url.searchParams.set('work_package[ignore_non_working_days]', this.nullAsEmptyStringFormatter(this.resource.includeNonWorkingDays));
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (this.resource?.id === 'new') {
      url.searchParams.set('work_package[start_date_touched]', 'true');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    this.turboFrameSrc = url.toString();
  }

  private nullAsEmptyStringFormatter(value:null|string):string {
    if (value === undefined || value === null) {
      return '';
    }
    return value;
  }
}
