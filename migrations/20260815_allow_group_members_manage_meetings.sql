-- Allow every member of a meeting's group to manage meeting-related data.
-- Run this once in the Supabase SQL Editor for existing databases.

CREATE POLICY "Group members can update meetings"
  ON meetings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = meetings.group_id AND group_members.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = meetings.group_id AND group_members.user_id = auth.uid()));

CREATE POLICY "Group members can delete meetings"
  ON meetings FOR DELETE
  USING (EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = meetings.group_id AND group_members.user_id = auth.uid()));

CREATE POLICY "Group members can manage attendees"
  ON meeting_attendees FOR ALL
  USING (EXISTS (SELECT 1 FROM meetings JOIN group_members ON group_members.group_id = meetings.group_id WHERE meetings.id = meeting_attendees.meeting_id AND group_members.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM meetings JOIN group_members ON group_members.group_id = meetings.group_id WHERE meetings.id = meeting_attendees.meeting_id AND group_members.user_id = auth.uid()));

CREATE POLICY "Group members can manage agenda items"
  ON agenda_items FOR ALL
  USING (EXISTS (SELECT 1 FROM meetings JOIN group_members ON group_members.group_id = meetings.group_id WHERE meetings.id = agenda_items.meeting_id AND group_members.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM meetings JOIN group_members ON group_members.group_id = meetings.group_id WHERE meetings.id = agenda_items.meeting_id AND group_members.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update tasks assigned to them or in their groups" ON tasks;
CREATE POLICY "Group members can manage tasks"
  ON tasks FOR ALL
  USING (EXISTS (SELECT 1 FROM meetings JOIN group_members ON group_members.group_id = meetings.group_id WHERE meetings.id = tasks.meeting_id AND group_members.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM meetings JOIN group_members ON group_members.group_id = meetings.group_id WHERE meetings.id = tasks.meeting_id AND group_members.user_id = auth.uid()));