import { useState, useRef, useEffect } from 'react';
import { Award } from 'lucide-react';
import { MemberAchievement } from '@newmeca/shared';

interface AchievementImageProps {
  achievement: MemberAchievement;
  className?: string;
}

/**
 * Renders an achievement image with dynamically overlaid score/value.
 * Uses the template base image and overlays the render_value using CSS positioning
 * based on the template's textX, textY, fontSize, and textColor properties.
 *
 * The positioning is calculated as a percentage of the natural image dimensions
 * to ensure proper scaling at any display size.
 */
export function AchievementImage({ achievement, className = '' }: AchievementImageProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [renderedSize, setRenderedSize] = useState<{ width: number; height: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get the value to display (prefer render_value, fall back to achieved_value)
  const displayValue = achievement.render_value ?? achievement.achieved_value;

  // Format the value (remove trailing .0 for whole numbers)
  const formattedValue = typeof displayValue === 'number'
    ? displayValue.toFixed(1).replace(/\.0$/, '')
    : displayValue;

  // Calculate actual rendered image dimensions accounting for object-contain
  const calculateRenderedImageSize = () => {
    if (!imgRef.current) return null;

    const containerWidth = imgRef.current.clientWidth;
    const containerHeight = imgRef.current.clientHeight;
    const naturalWidth = imgRef.current.naturalWidth;
    const naturalHeight = imgRef.current.naturalHeight;

    if (!containerWidth || !containerHeight || !naturalWidth || !naturalHeight) return null;

    // With object-contain, image scales to fit while maintaining aspect ratio
    const containerAspect = containerWidth / containerHeight;
    const imageAspect = naturalWidth / naturalHeight;

    let renderedWidth: number;
    let renderedHeight: number;

    if (imageAspect > containerAspect) {
      // Image is wider than container - width-constrained
      renderedWidth = containerWidth;
      renderedHeight = containerWidth / imageAspect;
    } else {
      // Image is taller than container - height-constrained
      renderedHeight = containerHeight;
      renderedWidth = containerHeight * imageAspect;
    }

    return { width: renderedWidth, height: renderedHeight };
  };

  // Handle image load to get natural dimensions and calculate rendered size
  const handleImageLoad = () => {
    if (imgRef.current) {
      setNaturalSize({
        width: imgRef.current.naturalWidth,
        height: imgRef.current.naturalHeight,
      });
      // Get actual rendered dimensions (accounting for object-contain)
      setRenderedSize(calculateRenderedImageSize());
      setImageLoaded(true);
    }
  };

  // Update rendered size on window resize
  useEffect(() => {
    const handleResize = () => {
      if (imgRef.current && imageLoaded) {
        setRenderedSize(calculateRenderedImageSize());
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [imageLoaded]);

  // Calculate CSS positioning based on template coordinates
  // The template coordinates are in pixels relative to the original image size
  // We scale them based on the rendered image size and account for object-contain centering
  const getTextStyle = (): React.CSSProperties => {
    if (!naturalSize || !renderedSize || !imgRef.current || !achievement.template_text_x || !achievement.template_text_y || !achievement.template_font_size) {
      return { display: 'none' };
    }

    const { width: naturalWidth, height: naturalHeight } = naturalSize;
    const { width: renderedWidth, height: renderedHeight } = renderedSize;
    const containerWidth = imgRef.current.clientWidth;
    const containerHeight = imgRef.current.clientHeight;
    const textX = achievement.template_text_x;
    const textY = achievement.template_text_y;
    const fontSize = achievement.template_font_size;

    // Calculate scale factor from natural to rendered size
    const scale = renderedHeight / naturalHeight;

    // Calculate offset due to object-contain centering
    const offsetX = (containerWidth - renderedWidth) / 2;
    const offsetY = (containerHeight - renderedHeight) / 2;

    // Scale the template coordinates to rendered size
    const scaledX = (textX / naturalWidth) * renderedWidth + offsetX;

    // Scale Y position - canvas uses baseline positioning
    // We position at the baseline Y and use transform to shift up
    const scaledY = (textY / naturalHeight) * renderedHeight + offsetY;

    // Calculate actual pixel font size based on rendered image scale
    // Apply 0.9 factor to prevent text from touching edges
    const scaledFontSize = Math.round(fontSize * scale * 0.9);

    return {
      position: 'absolute' as const,
      left: `${scaledX}px`,
      top: `${scaledY}px`,
      fontSize: `${scaledFontSize}px`,
      fontFamily: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif',
      fontWeight: 'bold',
      color: achievement.template_text_color || '#CC0F00',
      lineHeight: 1,
      whiteSpace: 'nowrap' as const,
      // Transform to convert from baseline positioning (canvas) to top positioning (CSS)
      // Move up by 92% of font height to approximate baseline alignment
      transform: 'translateY(-92%)',
    };
  };

  // Use template image if available, otherwise fall back to pre-generated image_url
  const imageUrl = achievement.template_base_image_url || achievement.image_url;

  if (!imageUrl) {
    // No image available - show placeholder
    return (
      <div className={`flex items-center justify-center h-full bg-gradient-to-br from-orange-500/20 to-red-500/20 ${className}`}>
        <Award className="h-12 w-12 text-orange-500" />
      </div>
    );
  }

  // If we have a pre-generated image but no template info, just show the image as-is
  if (achievement.image_url && !achievement.template_base_image_url) {
    return (
      <img
        src={achievement.image_url}
        alt={achievement.achievement_name}
        className={`w-full h-full object-contain ${className}`}
      />
    );
  }

  return (
    <div ref={containerRef} className={`relative w-full h-full ${className}`}>
      <img
        ref={imgRef}
        src={imageUrl}
        alt={achievement.achievement_name}
        className="w-full h-full object-contain"
        onLoad={handleImageLoad}
      />
      {imageLoaded && naturalSize && renderedSize && achievement.template_base_image_url && (
        <span style={getTextStyle()}>
          {formattedValue}
        </span>
      )}
    </div>
  );
}

export default AchievementImage;
