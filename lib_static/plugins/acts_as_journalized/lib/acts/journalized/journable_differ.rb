# frozen_string_literal: true

# -- copyright
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
# ++

module Acts::Journalized
  class JournableDiffer
    class << self
      def association_changes(original, changed, *)
        get_association_changes(original, changed, *)
      end

      def association_changes_multiple_attributes(original, changed, association, association_name, key, values)
        list = {}
        values.each do |value|
          list.store(value, get_association_changes(original, changed, association, association_name, key, value))
        end

        transformed = {}
        list.each do |key, value|
          value.each do |agenda_item, data|
            transformed["#{agenda_item}_#{key}"] = data
          end
        end

        transformed
      end

      private

      def get_association_changes(original, changed, association, association_name, key, value)
        original_journals = original&.send(association)&.map(&:attributes) || []
        changed_journals = changed.send(association).map(&:attributes)

        merged_journals = merge_reference_journals_by_id(original_journals, changed_journals, key.to_s, value.to_s)

        changes = merged_journals.reject do |_, (old_value, new_value)|
          old_value.to_s.strip == new_value.to_s.strip
        end

        changes.transform_keys { |id| "#{association_name}_#{id}" }
      end

      def merge_reference_journals_by_id(old_journals, new_journals, id_key, value)
        all_associated_journal_ids = (new_journals.pluck(id_key) | old_journals.pluck(id_key)).compact

        all_associated_journal_ids.index_with do |id|
          [select_and_combine_journals(old_journals, id, id_key, value),
           select_and_combine_journals(new_journals, id, id_key, value)]
        end
      end

      def select_and_combine_journals(journals, id, key, value)
        selected_journals = journals.select { |j| j[key] == id }.pluck(value)

        if selected_journals.empty?
          nil
        else
          selected_journals.sort.join(",")
        end
      end
    end
  end
end
