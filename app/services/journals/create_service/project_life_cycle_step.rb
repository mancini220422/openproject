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

module Journals
  module CreateService::ProjectLifeCycleStep
    private

    def cleanup_predecessor_project_life_cycle_step(predecessor)
      cleanup_predecessor(predecessor,
                          "project_life_cycle_step_journals",
                          :journal_id,
                          :id)
    end

    def insert_project_life_cycle_step_sql
      sanitize(<<~SQL.squish, journable_id:)
        INSERT INTO
          project_life_cycle_step_journals (
            journal_id,
            life_cycle_step_id,
            start_date,
            end_date,
            active
          )
        SELECT
          #{id_from_inserted_journal_sql},
          project_life_cycle_steps.id,
          project_life_cycle_steps.start_date,
          project_life_cycle_steps.end_date,
          project_life_cycle_steps.active
        FROM project_life_cycle_steps
        WHERE
          #{only_if_created_sql}
          AND project_life_cycle_steps.project_id = :journable_id
      SQL
    end

    def project_life_cycle_step_changes_sql
      sanitize(<<~SQL.squish, journable_id:)
        SELECT
          max_journals.journable_id
        FROM
          max_journals
        LEFT OUTER JOIN
          project_life_cycle_step_journals
        ON
          project_life_cycle_step_journals.journal_id = max_journals.id
        FULL JOIN
          (SELECT *
           FROM project_life_cycle_steps
           WHERE project_life_cycle_steps.project_id = :journable_id) life_cycle_steps
        ON
          life_cycle_steps.id = project_life_cycle_step_journals.life_cycle_step_id
        WHERE
          life_cycle_steps.start_date IS DISTINCT FROM project_life_cycle_step_journals.start_date
          OR life_cycle_steps.end_date IS DISTINCT FROM project_life_cycle_step_journals.end_date
          OR life_cycle_steps.active IS DISTINCT FROM project_life_cycle_step_journals.active
      SQL
    end
  end
end
