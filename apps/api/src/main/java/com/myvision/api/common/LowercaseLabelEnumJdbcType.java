package com.myvision.api.common;

import java.sql.CallableStatement;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.util.Locale;
import org.hibernate.dialect.PostgreSQLEnumJdbcType;
import org.hibernate.type.descriptor.ValueBinder;
import org.hibernate.type.descriptor.ValueExtractor;
import org.hibernate.type.descriptor.WrapperOptions;
import org.hibernate.type.descriptor.java.JavaType;
import org.hibernate.type.descriptor.jdbc.BasicBinder;
import org.hibernate.type.descriptor.jdbc.BasicExtractor;

/**
 * Maps UPPER_SNAKE Java enum constants to lower_snake PostgreSQL enum labels.
 * Needed when a database label (e.g. invoice_type 'final') is a Java keyword
 * and therefore cannot be used as an enum constant name.
 */
public class LowercaseLabelEnumJdbcType extends PostgreSQLEnumJdbcType {

  @Override
  public <X> ValueBinder<X> getBinder(JavaType<X> javaType) {
    return new BasicBinder<>(javaType, this) {
      @Override
      protected void doBind(PreparedStatement st, X value, int index, WrapperOptions options)
          throws SQLException {
        st.setObject(index, toLabel(value), Types.OTHER);
      }

      @Override
      protected void doBind(CallableStatement st, X value, String name, WrapperOptions options)
          throws SQLException {
        st.setObject(name, toLabel(value), Types.OTHER);
      }

      private String toLabel(X value) {
        return ((Enum<?>) value).name().toLowerCase(Locale.ROOT);
      }
    };
  }

  @Override
  public <X> ValueExtractor<X> getExtractor(JavaType<X> javaType) {
    return new BasicExtractor<>(javaType, this) {
      @Override
      protected X doExtract(ResultSet rs, int paramIndex, WrapperOptions options)
          throws SQLException {
        return fromLabel(rs.getString(paramIndex), options);
      }

      @Override
      protected X doExtract(CallableStatement statement, int index, WrapperOptions options)
          throws SQLException {
        return fromLabel(statement.getString(index), options);
      }

      @Override
      protected X doExtract(CallableStatement statement, String name, WrapperOptions options)
          throws SQLException {
        return fromLabel(statement.getString(name), options);
      }

      private X fromLabel(String label, WrapperOptions options) {
        if (label == null) {
          return null;
        }
        return getJavaType().wrap(label.toUpperCase(Locale.ROOT), options);
      }
    };
  }
}
