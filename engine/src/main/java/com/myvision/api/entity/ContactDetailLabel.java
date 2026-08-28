package com.myvision.api.entity;

/**
 * What a contact detail is for. Determines, among other things, where an invoice is sent.
 *
 * <p>"personal" rather than "private" because the latter is a Java keyword, and a constant that
 * has to be renamed on the way to the database is a trap waiting to be stepped on.
 */
public enum ContactDetailLabel {
  work,
  mobile,
  fax,
  personal,
  billing,
  newsletter,
  other
}
