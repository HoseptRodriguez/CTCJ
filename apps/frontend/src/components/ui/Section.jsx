import { motion } from 'framer-motion';

import { cn } from './cn.js';
import { Container } from './Container.jsx';
import { SectionHeading } from './SectionHeading.jsx';

// Each background variant auto-pairs its text color so a section can never
// end up with e.g. inverse navy text on an inverse navy background --
// callers pick a background, they never pick text color separately.
const BACKGROUND_CLASSES = {
  canvas: 'bg-canvas text-primary',
  raised: 'bg-raised text-primary',
  sunken: 'bg-sunken text-primary',
  inverse: 'bg-inverse text-on-inverse',
};

const headingMotionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.2, 0, 0, 1] } },
};

export function Section({
  id,
  background = 'canvas',
  heading,
  headingAlign,
  containerClassName,
  className,
  children,
  ...props
}) {
  const inverse = background === 'inverse';

  return (
    <section
      id={id}
      className={cn('py-16 md:py-24', BACKGROUND_CLASSES[background], className)}
      {...props}
    >
      <Container className={containerClassName}>
        {heading ? (
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={headingMotionVariants}
          >
            <SectionHeading {...heading} align={headingAlign} inverse={inverse} />
          </motion.div>
        ) : null}
        {children}
      </Container>
    </section>
  );
}
