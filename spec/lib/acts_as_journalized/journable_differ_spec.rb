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

require "spec_helper"

RSpec.describe Acts::Journalized::JournableDiffer do
  describe ".association_changes" do
    context "when the objects are work packages" do
      let(:original) do
        build(:work_package,
              custom_values: [
                build_stubbed(:work_package_custom_value, custom_field_id: 1, value: 1),
                build_stubbed(:work_package_custom_value, custom_field_id: 2, value: nil),
                build_stubbed(:work_package_custom_value, custom_field_id: 3, value: "")
              ])
      end

      let(:changed) do
        build(:work_package,
              custom_values: [
                build_stubbed(:work_package_custom_value, custom_field_id: 1, value: ""),
                build_stubbed(:work_package_custom_value, custom_field_id: 2, value: ""),
                build_stubbed(:work_package_custom_value, custom_field_id: 3, value: 2)
              ])
      end

      it "returns the changes" do
        params = [original, changed, "custom_values", "custom_field", :custom_field_id, :value]
        expect(described_class.association_changes(*params))
          .to eq(
            "custom_field_1" => ["1", ""],
            "custom_field_3" => ["", "2"]
          )
      end
    end

    context "with a default custom value" do
      let(:original) do
        build(:work_package,
              custom_values: [
                build_stubbed(:work_package_custom_value, custom_field_id: nil, value: nil),
                build_stubbed(:work_package_custom_value, custom_field_id: nil, value: ""),
                build_stubbed(:work_package_custom_value, custom_field_id: 2, value: 1)
              ])
      end

      let(:changed) do
        build(:work_package,
              custom_values: [
                build_stubbed(:work_package_custom_value, custom_field_id: 1, value: "t"),
                build_stubbed(:work_package_custom_value, custom_field_id: 2, value: 2)
              ])
      end

      it "returns the changes" do
        params = [original, changed, "custom_values", "custom_field", :custom_field_id, :value]
        expect(described_class.association_changes(*params))
          .to eq(
            "custom_field_1" => [nil, "t"],
            "custom_field_2" => ["1", "2"]
          )
      end
    end
  end

  describe ".association_changes_multiple_attributes" do
    let(:original) do
      build(:journal, project_life_cycle_step_journals: [
              build_stubbed(:project_life_cycle_step_journal, life_cycle_step_id: 1, active: false),
              build_stubbed(:project_life_cycle_step_journal, life_cycle_step_id: 3, active: true),
              build_stubbed(:project_life_cycle_step_journal, life_cycle_step_id: 4, active: true,
                                                              start_date: Date.new(2024, 1, 16),
                                                              end_date: Date.new(2024, 1, 17))
            ])
    end

    let(:changed) do
      build(:journal, project_life_cycle_step_journals: [
              build_stubbed(:project_life_cycle_step_journal, life_cycle_step_id: 1, active: true),
              build_stubbed(:project_life_cycle_step_journal, life_cycle_step_id: 2, active: true),
              build_stubbed(:project_life_cycle_step_journal, life_cycle_step_id: 3, active: false),
              build_stubbed(:project_life_cycle_step_journal, life_cycle_step_id: 4, active: true,
                                                              start_date: Date.new(2024, 1, 17),
                                                              end_date: Date.new(2024, 1, 18))
            ])
    end

    it "returns the changes" do
      params = [original, changed, "project_life_cycle_step_journals", "project_life_cycle_steps", :life_cycle_step_id,
                %i[active start_date end_date]]
      expect(described_class.association_changes_multiple_attributes(*params))
        .to eq(
          "project_life_cycle_steps_1_active" => ["false", "true"],
          "project_life_cycle_steps_2_active" => [nil, "true"],
          "project_life_cycle_steps_3_active" => ["true", "false"],
          "project_life_cycle_steps_4_end_date" => ["2024-01-17", "2024-01-18"],
          "project_life_cycle_steps_4_start_date" => ["2024-01-16", "2024-01-17"]
        )
    end
  end
end
