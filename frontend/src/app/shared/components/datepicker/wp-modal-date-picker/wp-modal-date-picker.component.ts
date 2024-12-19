//-- copyright
// OpenProject is an open source project management software.
// Copyright (C) the OpenProject GmbH
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License version 3.
//
// OpenProject is a fork of ChiliProject, which is a fork of Redmine. The copyright follows:
// Copyright (C) 2006-2013 Jean-Philippe Lang
// Copyright (C) 2010-2013 the ChiliProject Team
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License
// as published by the Free Software Foundation; either version 2
// of the License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
//
// See COPYRIGHT and LICENSE files for more details.
//++

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Injector,
  Input,
  ViewChild,
} from '@angular/core';
import { I18nService } from 'core-app/core/i18n/i18n.service';
import { TimezoneService } from 'core-app/core/datetime/timezone.service';
import { DayElement } from 'flatpickr/dist/types/instance';
import flatpickr from 'flatpickr';
import { ApiV3Service } from 'core-app/core/apiv3/api-v3.service';
import { onDayCreate } from 'core-app/shared/components/datepicker/helpers/date-modal.helpers';
import { DeviceService } from 'core-app/core/browser/device.service';
import { DatePicker } from '../datepicker';
import { UntilDestroyedMixin } from 'core-app/shared/helpers/angular/until-destroyed.mixin';
import { PathHelperService } from 'core-app/core/path-helper/path-helper.service';
import { populateInputsFromDataset } from 'core-app/shared/components/dataset-inputs';
import { fromEvent } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'op-wp-modal-date-picker',
  template: `
    <input
      id="flatpickr-input"
      #flatpickrTarget
      hidden>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: [
    '../styles/datepicker.modal.sass',
  ],
})
export class OpWpModalDatePickerComponent extends UntilDestroyedMixin implements AfterViewInit {
  @Input() public ignoreNonWorkingDays:boolean;
  @Input() public scheduleManually:boolean;

  @Input() public startDate:Date;
  @Input() public dueDate:Date;

  @Input() public isSchedulable:boolean = true;
  @Input() public minimalSchedulingDate:Date|null;

  @Input() fieldName:'start_date'|'due_date' = 'start_date';
  @Input() startDateFieldId:string;
  @Input() dueDateFieldId:string;

  @ViewChild('flatpickrTarget') flatpickrTarget:ElementRef;

  private datePickerInstance:DatePicker;

  constructor(
    readonly injector:Injector,
    readonly cdRef:ChangeDetectorRef,
    readonly apiV3Service:ApiV3Service,
    readonly I18n:I18nService,
    readonly timezoneService:TimezoneService,
    readonly deviceService:DeviceService,
    readonly pathHelper:PathHelperService,
    readonly elementRef:ElementRef,
  ) {
    super();
    populateInputsFromDataset(this);
  }

  ngAfterViewInit():void {
    this.initializeDatepicker();

    document.addEventListener('date-picker:input-changed', this.changeListener.bind(this));
  }

  ngOnDestroy():void {
    super.ngOnDestroy();

    document.removeEventListener('date-picker:input-changed', this.changeListener.bind(this));
  }

  changeListener(event:CustomEvent) {
    switch (event.detail.field) {
      case 'work_package[start_date]':
        this.startDate = event.detail.value;
        break;
      case 'work_package[due_date]':
        this.dueDate = event.detail.value;
        break;
      case 'work_package[ignore_non_working_days]':
        this.ignoreNonWorkingDays = event.detail.value !== 'true';
        break;
      default:
        // Case fallthrough for eslint
        return;
    }

    window.setTimeout(() => {
      this.initializeDatepicker();
    });
  }

  private initializeDatepicker() {
    this.datePickerInstance?.destroy();
    this.datePickerInstance = new DatePicker(
      this.injector,
      '#flatpickr-input',
      [this.startDate || '', this.dueDate || ''],
      {
        mode: 'range',
        showMonths: this.deviceService.isMobile ? 1 : 2,
        inline: true,
        onReady: (_date, _datestr, instance) => {
          instance.calendarContainer.classList.add('op-datepicker-modal--flatpickr-instance');

          this.ensureHoveredSelection(instance.calendarContainer);
        },
        onChange: (dates:Date[], _datestr, instance) => {
          if (this.fieldName === 'due_date') {
            this.dueDate = dates[0];
            this.setDateFieldAndFocus(this.dueDate, this.dueDateFieldId, this.startDateFieldId);
            this.fieldName = 'start_date';
          } else {
            this.startDate = dates[0];
            this.setDateFieldAndFocus(this.startDate, this.startDateFieldId, this.dueDateFieldId);
            this.fieldName = 'due_date';
          }

          instance.setDate([this.startDate, this.dueDate]);
        },
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        onDayCreate: async (dObj:Date[], dStr:string, fp:flatpickr.Instance, dayElem:DayElement) => {
          onDayCreate(
            dayElem,
            this.ignoreNonWorkingDays,
            await this.datePickerInstance?.isNonWorkingDay(dayElem.dateObj),
            this.isDayDisabled(dayElem),
          );
        },
      },
      this.flatpickrTarget.nativeElement,
    );
  }

  private isDayDisabled(dayElement:DayElement):boolean {
    const minimalDate = this.minimalSchedulingDate || null;
    return !this.isSchedulable || (!this.scheduleManually && !!minimalDate && dayElement.dateObj <= minimalDate);
  }

  /**
   * When hovering selections in the range datepicker, the range usually
   * stays active no matter where the cursor is.
   *
   * We want to hide any hovered selection preview when we leave the datepicker.
   * @param calendarContainer
   * @private
   */
  private ensureHoveredSelection(calendarContainer:HTMLDivElement) {
    fromEvent(calendarContainer, 'mouseenter')
      .pipe(
        this.untilDestroyed(),
      )
      .subscribe(() => calendarContainer.classList.remove('flatpickr-container-suppress-hover'));

    fromEvent(calendarContainer, 'mouseleave')
      .pipe(
        this.untilDestroyed(),
        filter(() => !(!!this.startDate && !!this.dueDate)),
      )
      .subscribe(() => calendarContainer.classList.add('flatpickr-container-suppress-hover'));
  }

  private setDateFieldAndFocus(date:Date, fieldId:string | null, nextFieldId:string | null):void {
    if (fieldId) {
      const field = document.getElementById(fieldId) as HTMLInputElement;
      field.value = this.timezoneService.formattedISODate(date);
      field.dispatchEvent(new Event('input'));
    }

    // Toggle focus to the next field
    if (nextFieldId) {
      document.getElementById(nextFieldId)?.focus();
    }
  }
}
