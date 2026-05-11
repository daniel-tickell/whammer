'use client';
import { UnitPoints } from './UnitPoints';

export const UnitName = ({ name, subname, points, legends, combatPatrol, externalImage, localImageUrl, imageZIndex, imagePositionX, imagePositionY, imageWidth, imageHeight }) => {
  const imageUrl = localImageUrl || externalImage;
  return (
    <div className="header_container" style={{ position: 'relative' }}>
      {imageUrl && (
        <img
          src={imageUrl}
          crossOrigin="anonymous"
          alt="Unit"
          style={{
            position: 'absolute',
            right: imagePositionX ? `calc(0px - ${imagePositionX}px)` : 0,
            top: imagePositionY ? `calc(0px + ${imagePositionY}px)` : 0,
            width: imageWidth ? `${imageWidth}px` : '380px',
            height: imageHeight ? `${imageHeight}px` : '196px',
            objectFit: 'contain',
            objectPosition: 'top right',
            zIndex: imageZIndex === 'onTop' ? 100 : 'auto',
          }}
        />
      )}
      <div className="name_container">
        <div className="name">{name}</div>
        {subname && <div className="subname">{subname}</div>}
      </div>
      {legends && <div className="legends" />}
      {combatPatrol && <div className="combatpatrol" />}
      <UnitPoints points={points} />
    </div>
  );
};
