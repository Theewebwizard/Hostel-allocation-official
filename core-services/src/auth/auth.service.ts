import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, Student, UserRole } from '../entities';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // If registering as student, validate required fields
    if (registerDto.role === UserRole.STUDENT) {
      if (
        !registerDto.rollNumber ||
        !registerDto.fullName ||
        !registerDto.year
      ) {
        throw new BadRequestException(
          'Roll number, full name, and year are required for student registration',
        );
      }

      // Check if roll number already exists
      const existingStudent = await this.studentRepository.findOne({
        where: { rollNumber: registerDto.rollNumber },
      });

      if (existingStudent) {
        throw new ConflictException(
          'Student with this roll number already exists',
        );
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(registerDto.password, 10);

    // Create user
    const user = this.userRepository.create({
      email: registerDto.email,
      passwordHash,
      role: registerDto.role,
    });

    await this.userRepository.save(user);

    // If student, create student profile
    if (registerDto.role === UserRole.STUDENT) {
      const student = this.studentRepository.create({
        userId: user.id,
        rollNumber: registerDto.rollNumber,
        fullName: registerDto.fullName,
        year: registerDto.year,
        gender: registerDto.gender,
        program: registerDto.program,
      });

      await this.studentRepository.save(student);
    }

    // Generate JWT token
    const payload = { email: user.email, sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
      relations: ['student'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { email: user.email, sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        student: user.student,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['student'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { passwordHash, ...result } = user;
    return result;
  }
}
