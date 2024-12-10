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
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  Input,
  OnInit,
  ViewEncapsulation,
} from '@angular/core';
import { UntilDestroyedMixin } from 'core-app/shared/helpers/angular/until-destroyed.mixin';
import { PathHelperService } from 'core-app/core/path-helper/path-helper.service';
import { ResourceChangeset } from 'core-app/shared/components/fields/changeset/resource-changeset';

@Component({
  selector: 'op-wp-multi-date-dialog-content',
  template: `
    <turbo-frame *ngIf="turboFrameSrc"
                 [src]="turboFrameSrc"
                 id="wp-datepicker-dialog--content">
      <op-content-loader viewBox="0 0 100 100">
        <svg:rect x="5" y="5" width="70" height="5" rx="1"/>

        <svg:rect x="80" y="5" width="15" height="5" rx="1"/>

        <svg:rect x="5" y="15" width="90" height="8" rx="1"/>

        <svg:rect x="5" y="30" width="90" height="12" rx="1"/>
      </op-content-loader>
    </turbo-frame>
    `,
  styleUrls: [
    '../styles/datepicker.modal.sass',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class OpWpMultiDateDialogContentComponent extends UntilDestroyedMixin implements OnInit {
  @HostBinding('class.op-datepicker-modal') className = true;

  @HostBinding('class.op-datepicker-modal_wide') classNameWide = true;

  @Input() changeset:ResourceChangeset;

  public turboFrameSrc:string;

  constructor(
    readonly pathHelper:PathHelperService,
  ) {
    super();
  }

  ngOnInit():void {
    this.turboFrameSrc = this.pathHelper.workPackageDatepickerDialogContentPath(this.changeset.id);
  }
}
