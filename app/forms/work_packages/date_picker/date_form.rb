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

module WorkPackages
  module DatePicker
    class DateForm < ApplicationForm
      ##
      # Primer::Forms::BaseComponent or ApplicationForm will always autofocus the
      # first input field with an error present on it. Despite this behavior being
      # a11y-friendly, it breaks the modal's UX when an invalid input field
      # is rendered.
      #
      # The reason for this is since we're implementing a "format on blur", when
      # we make a request to the server that will set an input field in an invalid
      # state and it is returned as such, any time we blur this autofocused field,
      # we'll perform another request that will still have the input in an invalid
      # state causing it to autofocus again and preventing us from leaving this
      # "limbo state".
      ##
      def before_render
        # no-op
      end

      attr_reader :work_package

      def initialize(work_package:,
                     schedule_manually:,
                     disabled:,
                     focused_field: :start_date,
                     touched_field_map: {})
        super()

        @work_package = work_package
        @schedule_manually = schedule_manually
        @is_milestone = work_package.milestone?
        @focused_field = focused_field
        @touched_field_map = touched_field_map
        @disabled = disabled
      end

      form do |query_form|
        query_form.group(layout: :horizontal) do |group|
          group.hidden(name: "schedule_manually", value: @schedule_manually)

          if @is_milestone
            text_field(group, name: :start_date, label: I18n.t("attributes.date"))

            hidden_touched_field(group, name: :start_date)
          else
            text_field(group, name: :start_date, label: I18n.t("attributes.start_date"))
            text_field(group, name: :due_date, label: I18n.t("attributes.due_date"))
            text_field(group, name: :duration, label: I18n.t("activerecord.attributes.work_package.duration"))

            hidden_touched_field(group, name: :start_date)
            hidden_touched_field(group, name: :due_date)
            hidden_touched_field(group, name: :duration)
          end

          hidden_touched_field(group, name: :ignore_non_working_days)
          hidden_touched_field(group, name: :schedule_manually)

          group.fields_for(:initial) do |builder|
            WorkPackages::DatePicker::InitialValuesForm.new(builder, work_package:)
          end
        end
      end

      private

      def text_field(group, name:, label:)
        text_field_options = default_field_options(name).merge(
          name:,
          value: field_value(name),
          disabled: disabled?(name),
          label:,
          caption: caption(name),
          classes: "op-datepicker-modal--date-field #{'op-datepicker-modal--date-field_current' if @focused_field == name}",
          validation_message: validation_message(name)
        )

        group.text_field(**text_field_options)
      end

      def caption(name)
        return if duration_field?(name)

        text = I18n.t(:label_today).capitalize

        return text if @disabled

        render(Primer::Beta::Link.new(href: "",
                                      data: {
                                        action: "work-packages--date-picker--preview#setTodayForField",
                                        "work-packages--date-picker--preview-field-reference-param": "work_package_#{name}",
                                        test_selector: "op-datepicker-modal--#{name.to_s.dasherize}-field--today"
                                      })) { text }
      end

      def hidden_touched_field(group, name:)
        group.hidden(name: :"#{name}_touched",
                     value: touched(name),
                     data: { "work-packages--date-picker--preview-target": "touchedFieldInput",
                             "referrer-field": name })
      end

      def touched(name)
        @touched_field_map["#{name}_touched"] || false
      end

      def duration_field?(name)
        name == :duration
      end

      def disabled?(name)
        if name == :duration
          if !@schedule_manually && @work_package.children.any?
            return true
          end

          return false
        end

        @disabled
      end

      def field_value(name)
        errors = @work_package.errors.where(name)
        if (user_value = errors.map { |error| error.options[:value] }.find { !_1.nil? })
          user_value
        else
          @work_package.public_send(name)
        end
      end

      def validation_message(name)
        # it's ok to take the first error only, that's how primer_view_component does it anyway.
        message = @work_package.errors.messages_for(name).first
        message&.upcase_first
      end

      def default_field_options(name)
        data = { "work-packages--date-picker--preview-target": "fieldInput",
                 action: "work-packages--date-picker--preview#markFieldAsTouched " \
                         "focus->work-packages--date-picker--preview#highlightField",
                 test_selector: "op-datepicker-modal--#{name.to_s.dasherize}-field" }

        if @focused_field == name
          data[:qa_highlighted] = "true"
        end

        if @focused_field == name
          data[:focus] = "true"
        end
        { data: }
      end
    end
  end
end
