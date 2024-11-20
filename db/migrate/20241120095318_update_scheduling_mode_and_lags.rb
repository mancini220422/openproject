class UpdateSchedulingModeAndLags < ActiveRecord::Migration[7.1]
  def up
    migration_job = WorkPackages::AutomaticMode::MigrateValuesJob
    if Rails.env.development?
      migration_job.perform_now
    else
      migration_job.perform_later
    end
  end
end
