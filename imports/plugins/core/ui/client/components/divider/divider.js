import React from "react";
import PropTypes from "prop-types";
import classnames from "classnames";
import { pure } from "recompose";
import { Components, registerComponent } from "@reactioncommerce/reaction-components";

const Divider = (props) => {
  const { label, i18nKeyLabel } = props;

  const classes = classnames({
    rui: true,
    separator: true,
    divider: true,
    labeled: label || i18nKeyLabel
  });

  if (label) {
    return (
      <div className={classes} id={props.id}>
        <hr />
        <span className="label">
          <Components.Translation defaultValue={label} i18nKey={i18nKeyLabel} />
        </span>
        <hr />
      </div>
    );
  }

  return (
    <div className={classes}>
      <hr />
    </div>
  );
};

Divider.propTypes = {
  i18nKeyLabel: PropTypes.string,
  id: PropTypes.string,
  label: PropTypes.string
};

registerComponent("Divider", Divider, pure);

export default Divider;
