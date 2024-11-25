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
    table_work_packages.map(&:reload) if defined?(table_work_packages)
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
        subject           | scheduling mode
        wp already manual | manual
        wp automatic      | automatic
      TABLE

      it "creates a journal entry only for the changed work packages" do
        expect(wp_already_manual.journals.count).to eq(1)
        expect(wp_automatic.journals.count).to eq(1)
        expect(wp_automatic.lock_version).to eq(0)

        run_migration

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
          expect(wp_automatic.lock_version).to be > 0
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
      subject        | start date | due date   | scheduling mode
      wp automatic 1 | 2024-11-20 | 2024-11-21 | automatic
      wp automatic 2 |            | 2024-11-21 | automatic
      wp automatic 3 | 2024-11-20 |            | automatic
      wp automatic 4 |            |            | automatic
      wp manual 1    | 2024-11-20 | 2024-11-21 | manual
      wp manual 2    |            | 2024-11-21 | manual
      wp manual 3    | 2024-11-20 |            | manual
      wp manual 4    |            |            | manual
    TABLE

    it "switches to manual scheduling" do
      run_migration

      expect(table_work_packages).to all(be_schedule_manually)
    end
  end

  # spec from #42388, "Migration from an earlier version" section
  context "for work packages following another one" do
    let_work_packages(<<~TABLE)
      subject        | start date | due date   | scheduling mode | properties
      main           | 2024-11-19 | 2024-11-19 | manual          |
      wp automatic 1 | 2024-11-20 | 2024-11-21 | automatic       | follows main
      wp automatic 2 |            | 2024-11-21 | automatic       | follows main
      wp automatic 3 | 2024-11-20 |            | automatic       | follows main
      wp automatic 4 |            |            | automatic       | follows main
      wp manual 1    | 2024-11-20 | 2024-11-21 | manual          | follows main
      wp manual 2    |            | 2024-11-21 | manual          | follows main
      wp manual 3    | 2024-11-20 |            | manual          | follows main
      wp manual 4    |            |            | manual          | follows main
    TABLE

    # TODO: should work packages without any dates really be switched to manual like the specs say?
    it "switches to automatic scheduling" do
      run_migration

      expect(main).to be_schedule_manually
      expect(table_work_packages - [main]).to all(be_schedule_automatically)
    end
  end

  # spec from #42388, "Migration from an earlier version" section
  context "for parent work packages" do
    let_work_packages(<<~TABLE)
      hierarchy | scheduling mode |
      parent    | manual          |
        child   | manual          |
    TABLE

    it "switches to automatic scheduling" do
      run_migration

      expect(parent).to be_schedule_automatically
      expect(child).to be_schedule_manually
    end
  end

  context "for 2 work packages following each other with distant dates" do
    shared_let_work_packages(<<~TABLE)
      subject       | MTWTFSS | properties
      predecessor 1 | XX      |
      follower 1    |      XX | follows predecessor 1

      # only start dates
      predecessor 2 |  [      |
      follower 2    |      [  | follows predecessor 2

      # only due dates
      # if lag is already set, it's overwritten
      predecessor 3 |  ]      |
      follower 3    |      ]  | follows predecessor 3 with lag 2
    TABLE

    it "sets a lag to the relation to ensure the distance is kept" do
      run_migration

      expect(follower1).to be_schedule_automatically
      relations = _table.relations.map(&:reload)
      expect(relations.map(&:lag)).to all(eq(3))
    end

    context "when there are non-working days between the dates" do
      before do
        # Wednesday is a recurring non-working day
        set_non_working_week_days("wednesday")
        # Thursday is a fixed non-working day
        thursday = Date.current.next_occurring(:monday) + 3.days
        create(:non_working_day, date: thursday)
      end

      it "computes the lag correctly by excluding non-working days" do
        run_migration

        expect(follower1).to be_schedule_automatically
        relations = _table.relations.map(&:reload)
        expect(relations.map(&:lag)).to all(eq(1))
      end
    end
  end

  context "for 2 work packages following each other with missing dates" do
    let_work_packages(<<~TABLE)
      subject       | MTWTFSS | properties
      # only predecessor has dates
      predecessor 1 | XX      |
      follower 1    |         | follows predecessor 1

      # only successor has dates
      predecessor 2 |         |
      follower 2    |      XX | follows predecessor 2

      # none have dates
      predecessor 3 |         |
      follower 3    |         | follows predecessor 3 with lag 2
    TABLE

    it "does not change the existing lag" do
      run_migration

      expect(follower1).to be_schedule_automatically
      relations = _table.relations.map(&:reload)
      expect(relations.map(&:lag)).to eq([0, 0, 2])
    end
  end

  context "for a work package following multiple work packages" do
    shared_let_work_packages(<<~TABLE)
      subject       | MTWTFSS | properties
      predecessor 1 | XX      |
      predecessor 2 |  XX     |
      predecessor 3 | X       |
      follower      |      XX | follows predecessor 1, follows predecessor 2, follows predecessor 3
    TABLE

    it "sets a lag only to the closest relation" do
      run_migration

      relations = _table.relations.map(&:reload)
      expect(relations.map(&:lag)).to eq([0, 2, 0])
    end
  end
end
