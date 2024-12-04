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
    class BannerComponent < ApplicationComponent
      def initialize(work_package:, manually_scheduled: true)
        super

        @work_package = work_package
        @manually_scheduled = manually_scheduled
      end

      private

      def scheme
        @manually_scheduled ? :warning : :default
      end

      def link
        gantt_index_path(
          query_props: {
            c: %w[id subject type status assignee project startDate dueDate],
            tll: '{"left":"startDate","right":"subject","farRight":null}',
            tzl: "auto",
            t: "id:asc",
            tv: true,
            hi: true,
            f: [
              { "n" => "id", "o" => "=", "v" => all_relational_wp_ids }
            ]
          }.to_json.freeze
        )
      end

      def title
        if @manually_scheduled
          I18n.t("work_packages.datepicker_modal.banner.title.manually_scheduled")
        elsif children.any?
          I18n.t("work_packages.datepicker_modal.banner.title.automatic_with_children")
        elsif predecessor_relations.any?
          I18n.t("work_packages.datepicker_modal.banner.title.automatic_with_predecessor")
        end
      end

      def description
        if @manually_scheduled
          if children.any?
            return I18n.t("work_packages.datepicker_modal.banner.description.manual_with_children")
          elsif predecessor_relations.any?
            if overlapping_predecessor?
              return I18n.t("work_packages.datepicker_modal.banner.description.manual_overlap_with_predecessors")
            elsif predecessor_with_large_gap?
              return I18n.t("work_packages.datepicker_modal.banner.description.manual_gap_between_predecessors")
            end
          end
        end

        I18n.t("work_packages.datepicker_modal.banner.description.click_on_show_relations_to_open_gantt",
               button_name: I18n.t("work_packages.datepicker_modal.show_relations"))
      end

      def overlapping_predecessor?
        predecessor_work_packages.any? { |wp| wp.due_date.after?(@work_package.start_date) }
      end

      def predecessor_with_large_gap?
        sorted = predecessor_work_packages.sort_by(&:due_date)
        sorted.last.due_date.before?(@work_package.start_date - 2)
      end

      def predecessor_relations
        @predecessor_relations ||= @work_package.follows_relations
      end

      def predecessor_work_packages
        @predecessor_work_packages ||= predecessor_relations
                                         .includes(:to)
                                         .map(&:to)
      end

      def children
        @children ||= @work_package.children
      end

      def all_relational_wp_ids
        @work_package
          .relations
          .pluck(:from_id, :to_id)
          .flatten
          .uniq
      end
    end
  end
end
