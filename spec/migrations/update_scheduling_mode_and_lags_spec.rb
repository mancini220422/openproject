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

require "spec_helper"
require Rails.root.join("db/migrate/20241120095318_update_scheduling_mode_and_lags.rb")

RSpec.describe UpdateSchedulingModeAndLags, type: :model do
  # Silencing migration logs, since we are not interested in that during testing
  subject(:run_migration) do
    perform_enqueued_jobs do
      ActiveRecord::Migration.suppress_messages { described_class.new.up }
    end
  end

  shared_let(:author) { create(:user) }
  shared_let(:priority) { create(:priority, name: "Normal") }
  shared_let(:project) { create(:project, name: "Main project") }
  shared_let(:status_new) { create(:status, name: "New") }

  before_all do
    set_factory_default(:user, author)
    set_factory_default(:priority, priority)
    set_factory_default(:project, project)
    set_factory_default(:project_with_types, project)
    set_factory_default(:status, status_new)
  end

  describe "journal creation" do
    context "when scheduling mode is changed by the migration" do
      let_work_packages(<<~TABLE)
        subject           | schedule manually
        wp already manual | true
        wp automatic      | false
      TABLE

      before do
        run_migration
      end

      it "creates a journal entry only for the changed work packages" do
        expect(wp_already_manual.journals.count).to eq(1)
        expect(wp_automatic.journals.count).to eq(2)

        expect(wp_automatic.last_journal.get_changes)
          .to include("schedule_manually" => [false, true],
                      "cause" => [nil, { "feature" => "scheduling_mode_adjusted", "type" => "system_update" }])

        aggregate_failures "the journal author is the system user" do
          journal = wp_automatic.last_journal
          expect(journal.user).to eq(User.system)
        end

        aggregate_failures "the lock_version of the work package is incremented" do
          previous_lock_version = wp_automatic.lock_version
          wp_automatic.reload
          expect(wp_automatic.lock_version).to be > previous_lock_version
        end

        aggregate_failures "changes the updated_at of the work package" do
          expect(wp_automatic.updated_at).not_to eq(wp_automatic.created_at)
          expect(wp_automatic.updated_at).to be > wp_automatic.created_at

          first_journal, last_journal = wp_automatic.journals
          expect(wp_automatic.updated_at).not_to eq(first_journal.updated_at)
          expect(wp_automatic.updated_at).to eq(last_journal.updated_at)
        end
      end
    end
  end

  # spec from #42388, "Migration from an earlier version" section
  context "for work packages with no predecessors" do
    let_work_packages(<<~TABLE)
      subject        | start date | due date   | schedule manually
      wp automatic 1 | 2024-11-20 | 2024-11-21 | false
      wp automatic 2 |            | 2024-11-21 | false
      wp automatic 3 | 2024-11-20 |            | false
      wp automatic 4 |            |            | false
      wp manual 1    | 2024-11-20 | 2024-11-21 | true
      wp manual 2    |            | 2024-11-21 | true
      wp manual 3    | 2024-11-20 |            | true
      wp manual 4    |            |            | true
    TABLE

    it "switches to manual scheduling" do
      run_migration

      table_work_packages.map(&:reload)
      expect(table_work_packages).to all(be_schedule_manually)
    end
  end
end
