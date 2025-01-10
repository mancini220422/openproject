# frozen_string_literal: true

#-- copyright
# OpenProject is an open source project management software.
# Copyright (C) the OpenProject GmbH
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License version 3.
#
# OpenProject is a fork of ChiliProject, which is a fork of Redmine. The copyright follows:
# Copyright (C) 2006-2013 Jean-Philippe Lang
# Copyright (C) 2010-2013 the ChiliProject Team
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
#
# See COPYRIGHT and LICENSE files for more details.
#++

module Meetings
  class DeleteDialogComponent < ApplicationComponent
    include ApplicationHelper
    include OpTurbo::Streamable

    def initialize(meeting:, project:)
      super

      @meeting = meeting
      @project = project
    end

    private

    def id = "delete-meeting-dialog"

    def title = I18n.t("meeting.delete_dialog.title")

    def confirmation_message
      if recurring_meeting.present?
        I18n.t(:label_recurring_meeting_delete_confirmation, name: recurring_meeting.title)
      else
        I18n.t("text_are_you_sure")
      end
    end

    def recurring?
      @meeting.is_a?(RecurringMeeting)
    end

    def recurring_meeting
      return if recurring?

      @meeting.recurring_meeting
    end
  end
end
