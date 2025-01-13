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

# frozen_string_literal: true

module WorkPackages
  module DatePicker
    class DialogContentComponent < ApplicationComponent
      include OpPrimer::ComponentHelpers
      include OpTurbo::Streamable

      DIALOG_FORM_ID = "datepicker-form"

      attr_accessor :work_package, :schedule_manually, :focused_field, :touched_field_map

      def initialize(work_package:, schedule_manually: true, focused_field: :start_date, touched_field_map: {})
        super

        @work_package = work_package
        @schedule_manually = ActiveModel::Type::Boolean.new.cast(schedule_manually)
        @focused_field = parse_focused_field(focused_field)
        @touched_field_map = touched_field_map
      end

      private

      def submit_path
        if work_package.new_record?
          url_for(controller: "work_packages/date_picker",
                  action: "create")
        else
          url_for(controller: "work_packages/date_picker",
                  action: "update",
                  work_package_id: work_package.id)
        end
      end

      def precedes_relations
        @precedes_relations ||= work_package.precedes_relations
      end

      def follow_relations
        @follow_relations ||= work_package.follows_relations
      end

      def children
        @children ||= work_package.children
      end

      def disabled?
        !schedule_manually
      end

      def additional_tabs
        [
          {
            key: "predecessors",
            relations: follow_relations
          },
          {
            key: "successors",
            relations: precedes_relations
          },
          {
            key: "children",
            relations: children,
            is_child_relation?: true
          }
        ]
      end

      def schedulable?
        @schedule_manually || precedes_relations.any?
      end

      def parse_focused_field(focused_field)
        %i[start_date due_date duration].include?(focused_field) ? focused_field : :start_date
      end
    end
  end
end
