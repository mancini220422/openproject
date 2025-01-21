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
import { fromEvent, Subject } from 'rxjs';
import { debounceTime, filter } from 'rxjs/operators';
import * as _ from 'lodash';

@Component({
  selector: 'op-wp-modal-date-picker',
  template: `
    <input
      id="flatpickr-input"
      #flatpickrTarget
      hidden>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpWpModalDatePickerComponent extends UntilDestroyedMixin implements AfterViewInit {
  @Input() public ignoreNonWorkingDays:boolean;
  @Input() public scheduleManually:boolean;

  @Input() public startDate:Date|null;
  @Input() public dueDate:Date|null;

  @Input() public isSchedulable:boolean = true;
  @Input() public minimalSchedulingDate:Date|null;

  @Input() startDateFieldId:string;
  @Input() dueDateFieldId:string;
  @Input() durationFieldId:string;

  @Input() isMilestone:boolean = false;

  @ViewChild('flatpickrTarget') flatpickrTarget:ElementRef;

  fieldName:'start_date'|'due_date'|'duration' = 'start_date';

  private datePickerInstance:DatePicker;
  private initializeDatepickerSubject = new Subject<void>();

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

    // To make sure the datepicker is reinitialized only once when multiple change events are received
    this.initializeDatepickerSubject.pipe(
      debounceTime(0),
    ).subscribe(() => this.initializeDatepicker());
  }

  ngAfterViewInit():void {
    this.initializeDatepickerSubject.next();

    document.addEventListener('date-picker:input-changed', this.changeListener.bind(this));
  }

  // eslint-disable-next-line @angular-eslint/use-lifecycle-interface
  ngOnDestroy():void {
    super.ngOnDestroy();

    document.removeEventListener('date-picker:input-changed', this.changeListener.bind(this));
  }

  changeListener(event:CustomEvent) {
    const details = (event.detail as { field:string, value:string });

    switch (details.field) {
      case 'work_package[start_date]':
        this.startDate = this.toDate(details.value);
        break;
      case 'work_package[due_date]':
        this.dueDate = this.toDate(details.value);
        break;
      case 'work_package[ignore_non_working_days]':
        this.ignoreNonWorkingDays = details.value !== 'true';
        break;
      default:
        // Case fallthrough for eslint
        return;
    }

    // Emit an event to the subject, which will be debounced and trigger the datepicker initialization
    this.initializeDatepickerSubject.next();
  }

  private toDate(date:string):Date|null {
    if (date) {
      return new Date(date);
    }
    return null;
  }

  private currentDates():Date[] {
    return _.compact([this.startDate, this.dueDate]);
  }

  private initializeDatepicker() {
    this.datePickerInstance?.destroy();
    const ignoreNonWorkingDaysTemp = this.ignoreNonWorkingDays;

    this.datePickerInstance = new DatePicker(
      this.injector,
      '#flatpickr-input',
      this.currentDates(),
      {
        mode: this.isMilestone ? 'single' : 'range',
        showMonths: this.deviceService.isMobile ? 1 : 2,
        inline: true,
        onReady: (_date, _datestr, instance) => {
          instance.calendarContainer.classList.add('op-datepicker-modal--flatpickr-instance');

          this.ensureHoveredSelection(instance.calendarContainer);
        },
        onChange: this.onFlatpickrChange.bind(this),
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        onDayCreate: async (dObj:Date[], dStr:string, fp:flatpickr.Instance, dayElem:DayElement) => {
          onDayCreate(
            dayElem,
            ignoreNonWorkingDaysTemp,
            await this.datePickerInstance?.isNonWorkingDay(dayElem.dateObj),
            this.isDayDisabled(dayElem),
          );
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      this.flatpickrTarget.nativeElement,
    );
  }

  private onFlatpickrChange(dates:Date[], _datestr:string, instance:flatpickr.Instance) {
    this.fieldName = this.getActiveField();

    if (this.isMilestone) {
      this.setStartDate(dates[0]);
      instance.setDate(dates[0]);
    } else {
      const selectedDate:Date = this.lastClickedDate(dates) || dates[0];
      if (this.fieldName === 'due_date') {
        this.setDueDate(selectedDate);
        this.fieldName = 'start_date';
      } else {
        this.setStartDate(selectedDate);
        this.fieldName = 'due_date';
      }
      instance.setDate(this.currentDates());
    }
  }

  private lastClickedDate(changedDates:Date[]):Date|null {
    const flatPickrDates = changedDates.map((date) => this.timezoneService.formattedISODate(date));
    const fieldDates = _.compact([this.startDate, this.dueDate])
                        .map((date) => this.timezoneService.formattedISODate(date));
    if (flatPickrDates.length === 1) {
      return this.toDate(flatPickrDates[0]);
    }
    const diff = _.difference(flatPickrDates, fieldDates);
    return this.toDate(diff[0]);
  }

  // Sets the start date to the given date.
  //
  // If the given date is after the due date, then there are two cases:
  //   - if only one date is already set, then dates are swapped so that start
  //     date is before due date.
  //   - if both dates are already set, then the due date is cleared because it
  //     can't be before the start date.
  private setStartDate(date:Date) {
    if (this.dueDate && date > this.dueDate) {
      if (this.startDate) {
        // if both dates are set and the clicked date is after the due date,
        // then the start date is set to the clicked date the due date is cleared
        this.startDate = date;
        this.dueDate = null;
      } else {
        // else one of the two dates is not set, so we are smart and swap them
        this.startDate = this.dueDate;
        this.dueDate = date;
      }
      this.updateDateField(this.dueDate, this.dueDateFieldId);
    } else {
      // simply set the start date
      this.startDate = date;
    }
    this.updateDateField(this.startDate, this.startDateFieldId);
  }

  // Sets the due date to the given date.
  //
  // If the given date is before the start date, then there are two cases:
  //   - if only one date is already set, then dates are swapped so that start
  //     date is before due date.
  //   - if both dates are already set, then the start date is cleared because
  //     it can't be after the due date.
  private setDueDate(date:Date) {
    if (this.startDate && this.startDate > date) {
      if (this.dueDate) {
        // if both dates are set and the clicked date is before the start date,
        // then the due date is set to the clicked date the start date is cleared
        this.startDate = null;
        this.dueDate = date;
      } else {
        // else one of the two dates is not set, so we are smart and swap them
        this.dueDate = this.startDate;
        this.startDate = date;
      }
      this.updateDateField(this.startDate, this.startDateFieldId);
    } else {
      // simply set the due date
      this.dueDate = date;
    }
    this.updateDateField(this.dueDate, this.dueDateFieldId);
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

  private getActiveField():'start_date'|'due_date'|'duration' {
    const activeField = document.getElementsByClassName('op-datepicker-modal--date-field_current')[0];

    if (!activeField) {
      return this.fieldName;
    }

    switch (activeField.id) {
      case this.dueDateFieldId:
        return 'due_date';
      case this.durationFieldId:
        return 'duration';
      default:
        return 'start_date';
    }
  }

  private updateDateField(date:Date|null, fieldId:string | null):void {
    if (fieldId) {
      const field = document.getElementById(fieldId) as HTMLInputElement;
      if (date) {
        field.value = this.timezoneService.formattedISODate(date);
      } else {
        field.value = '';
      }
      field.dispatchEvent(new Event('input'));
    }
  }
}
