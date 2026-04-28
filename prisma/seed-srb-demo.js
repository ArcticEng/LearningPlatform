const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Find SRB tenant
  const tenant = await prisma.tenant.findUnique({ where: { slug: "scarletrose" } });
  if (!tenant) { console.error("❌ SRB tenant not found. Run the main seed first."); return; }

  console.log("✅ Found SRB tenant:", tenant.name);

  // ═══════════════════════════════════════
  // 1. Create demo course
  // ═══════════════════════════════════════
  let course = await prisma.course.findFirst({ where: { title: "Nail Art Foundations", tenantId: tenant.id } });
  if (!course) {
    course = await prisma.course.create({
      data: {
        title: "Nail Art Foundations",
        description: "A beginner-friendly course covering the fundamentals of nail art, from basic techniques to creative designs. Perfect for aspiring nail technicians starting their journey.",
        tenantId: tenant.id,
        price: 0, // free for demo
      },
    });
    console.log("✅ Course created: Nail Art Foundations");
  } else {
    console.log("ℹ️  Course already exists");
  }

  // ═══════════════════════════════════════
  // 2. Create modules
  // ═══════════════════════════════════════
  const modules = [
    {
      title: "Module 1: Introduction to Nail Care",
      order: 0,
      questions: [
        { text: "What is the primary purpose of a base coat?", optionA: "To add colour to the nail", optionB: "To protect the natural nail and improve polish adhesion", optionC: "To remove old nail polish", optionD: "To file the nail into shape", correct: 1 },
        { text: "How often should nail tools be sanitised?", optionA: "Once a week", optionB: "Once a month", optionC: "Before and after each client", optionD: "Only when visibly dirty", correct: 2 },
        { text: "Which of the following is a sign of a healthy nail?", optionA: "Yellow discolouration", optionB: "Smooth, pink nail bed with no ridges", optionC: "Brittle and flaking edges", optionD: "White spots covering the entire nail", correct: 1 },
        { text: "What is the correct order of a basic manicure?", optionA: "Polish, file, soak, push cuticles", optionB: "File, soak, push cuticles, base coat, polish, top coat", optionC: "Soak, polish, file, top coat", optionD: "Push cuticles, soak, file, polish", correct: 1 },
        { text: "What does the term 'free edge' refer to?", optionA: "The skin around the nail", optionB: "The part of the nail that extends past the fingertip", optionC: "The half-moon shape at the base of the nail", optionD: "The nail bed underneath the nail plate", correct: 1 },
      ],
    },
    {
      title: "Module 2: Colour Theory & Design Basics",
      order: 1,
      questions: [
        { text: "Which colours are considered primary colours?", optionA: "Red, yellow, blue", optionB: "Red, green, purple", optionC: "Orange, green, violet", optionD: "Pink, white, black", correct: 0 },
        { text: "What do you get when you mix a primary colour with a secondary colour?", optionA: "A neutral colour", optionB: "A tertiary colour", optionC: "White", optionD: "Black", correct: 1 },
        { text: "Which colour combination creates the strongest contrast?", optionA: "Blue and green", optionB: "Red and orange", optionC: "Black and white", optionD: "Pink and purple", correct: 2 },
        { text: "What is a 'complementary colour scheme'?", optionA: "Using colours next to each other on the colour wheel", optionB: "Using only one colour in different shades", optionC: "Using colours directly opposite each other on the colour wheel", optionD: "Using only warm colours", correct: 2 },
        { text: "Which tool is best for creating fine line nail art details?", optionA: "A fan brush", optionB: "A striping brush or liner brush", optionC: "A sponge", optionD: "A buffer block", correct: 1 },
      ],
    },
    {
      title: "Module 3: Health, Safety & Hygiene",
      order: 2,
      questions: [
        { text: "What is the minimum required action if a client has a visible nail infection?", optionA: "Apply extra base coat and proceed", optionB: "Refer the client to a medical professional and do not proceed with the service", optionC: "Use stronger cleaning solution and continue", optionD: "Ignore it if the client insists on the service", correct: 1 },
        { text: "Which product is used to disinfect metal nail tools?", optionA: "Soap and water", optionB: "Barbicide or hospital-grade disinfectant", optionC: "Nail polish remover", optionD: "Hand cream", correct: 1 },
        { text: "Why must a nail technician wear gloves during certain procedures?", optionA: "To keep hands warm", optionB: "To prevent cross-contamination and protect against chemicals", optionC: "To make the service look more professional", optionD: "Gloves are not necessary", correct: 1 },
        { text: "What should be done with single-use items like nail files after a client session?", optionA: "Wipe with a cloth and reuse", optionB: "Dispose of them immediately", optionC: "Soak in water for the next client", optionD: "Store them in a drawer for later", correct: 1 },
        { text: "What is the most important reason for maintaining a clean workstation?", optionA: "It looks nice for photos", optionB: "To prevent the spread of bacteria and infections between clients", optionC: "Clients don't notice either way", optionD: "It is only important during inspections", correct: 1 },
      ],
    },
  ];

  for (const mod of modules) {
    let existing = await prisma.module.findFirst({
      where: { title: mod.title, courseId: course.id },
    });

    if (!existing) {
      existing = await prisma.module.create({
        data: {
          title: mod.title,
          order: mod.order,
          courseId: course.id,
        },
      });
      console.log(`✅ Module created: ${mod.title}`);
    } else {
      console.log(`ℹ️  Module already exists: ${mod.title}`);
    }

    // Create test for module
    const existingTest = await prisma.test.findUnique({ where: { moduleId: existing.id } });
    if (!existingTest) {
      await prisma.test.create({
        data: {
          moduleId: existing.id,
          questions: {
            create: mod.questions.map((q, i) => ({
              text: q.text,
              optionA: q.optionA,
              optionB: q.optionB,
              optionC: q.optionC,
              optionD: q.optionD,
              correct: q.correct,
              order: i,
            })),
          },
        },
      });
      console.log(`   ✅ Test created: ${mod.questions.length} questions`);
    } else {
      console.log(`   ℹ️  Test already exists`);
    }
  }

  // ═══════════════════════════════════════
  // 3. Create access code SRB-DEMO-2026
  // ═══════════════════════════════════════
  const existingCode = await prisma.accessCode.findFirst({
    where: { code: "SRB-DEMO-2026", tenantId: tenant.id },
  });

  if (!existingCode) {
    await prisma.accessCode.create({
      data: {
        code: "SRB-DEMO-2026",
        tenantId: tenant.id,
        courseId: course.id, // auto-assigns this course on registration
        maxUses: 0, // unlimited
        active: true,
      },
    });
    console.log("✅ Access code created: SRB-DEMO-2026 (linked to Nail Art Foundations)");
  } else {
    console.log("ℹ️  Access code SRB-DEMO-2026 already exists");
  }

  console.log("\n🎉 Demo setup complete!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Course: Nail Art Foundations (3 modules, 15 questions)");
  console.log("Access Code: SRB-DEMO-2026");
  console.log("Admin Login: /scarletrose → admin / admin123");
  console.log("Demo Registration: /scarletrose → Register → SRB-DEMO-2026");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
