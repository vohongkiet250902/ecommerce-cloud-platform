import { CommandFactory } from 'nest-commander';
import { SeedSearchDemoModule } from './seed/seed-search-demo.module';

async function bootstrap() {
  await CommandFactory.run(SeedSearchDemoModule, {
    errorHandler: (err) => {
      // eslint-disable-next-line no-console
      console.error(err);
      process.exit(1);
    },
  });
}
bootstrap();
