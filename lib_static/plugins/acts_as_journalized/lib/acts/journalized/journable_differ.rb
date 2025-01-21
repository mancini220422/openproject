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

      def association_changes_multiple_attributes(original, changed, association, key_prefix, id_attribute, attributes)
        list = {}
        attributes.each do |attribute|
          list.store(attribute, get_association_changes(original, changed, association, key_prefix, id_attribute, attribute))
        end

        transformed = {}
        list.each do |attribute, changes|
          changes.each do |key, change|
            transformed["#{key}_#{attribute}"] = change
          end
        end

        transformed
      end

      private

      def get_association_changes(original, changed, association, key, id_attribute, attribute)
        original_journals = original&.send(association)&.map(&:attributes) || []
        changed_journals = changed.send(association).map(&:attributes)

        merged_journals = merge_reference_journals_by_id(original_journals, changed_journals, id_attribute.to_s, attribute.to_s)

        changes = merged_journals.reject do |_, (old_value, new_value)|
          old_value.to_s.strip == new_value.to_s.strip
        end

        changes.transform_keys { |id| "#{key}_#{id}" }
      end

      def merge_reference_journals_by_id(old_journals, new_journals, id_attribute, attribute)
        all_associated_journal_ids = (new_journals.pluck(id_attribute) | old_journals.pluck(id_attribute)).compact

        all_associated_journal_ids.index_with do |id|
          [select_and_combine_journals(old_journals, id, id_attribute, attribute),
           select_and_combine_journals(new_journals, id, id_attribute, attribute)]
        end
      end

      def select_and_combine_journals(journals, id, id_attribute, attribute)
        selected_journals = journals.select { |j| j[id_attribute] == id }.pluck(attribute)

        if selected_journals.empty?
          nil
        else
          selected_journals.sort.join(",")
        end
      end
    end
  end
end
